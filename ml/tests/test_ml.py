"""
ml/tests/test_ml.py
-------------------
Automated pytest suite for the ML microservice, data integrity, and model evaluation.
Verifies:
  - Model artifacts exist and can be loaded.
  - Evaluation report contains authentic metrics for all classes.
  - Real inference produces valid predictions within allowable enum values.
  - Flask HTTP endpoints (/health and /predict) respond correctly.
  - Input validation and error handling in Flask service.
"""

import sys
import os
import json
import pytest
import joblib

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ML_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, '..'))
if ML_DIR not in sys.path:
    sys.path.insert(0, ML_DIR)

from predict_service import app, load_models

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ML_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, '..'))
MODELS_DIR = os.path.join(ML_DIR, 'models')
CAT_MODEL_PATH = os.path.join(MODELS_DIR, 'category_model.joblib')
PRI_MODEL_PATH = os.path.join(MODELS_DIR, 'priority_model.joblib')
EVAL_REPORT_PATH = os.path.join(ML_DIR, 'evaluation_report.json')

CATEGORIES = {'Technical Issue', 'Billing', 'Account Access', 'General Inquiry'}
PRIORITIES = {'Low', 'Medium', 'High'}


@pytest.fixture(scope='module')
def client():
    load_models()
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client


# ── 1. Model Artifact Tests ───────────────────────────────────────────────────

def test_models_exist():
    """Verify serialized model artifacts exist."""
    assert os.path.exists(CAT_MODEL_PATH), "Category model artifact missing"
    assert os.path.exists(PRI_MODEL_PATH), "Priority model artifact missing"


def test_models_can_be_loaded():
    """Verify model pipelines can be loaded by joblib."""
    cat_pipe = joblib.load(CAT_MODEL_PATH)
    pri_pipe = joblib.load(PRI_MODEL_PATH)
    assert cat_pipe is not None
    assert pri_pipe is not None
    assert hasattr(cat_pipe, 'predict')
    assert hasattr(pri_pipe, 'predict')


# ── 2. Evaluation Report Authenticity Tests ────────────────────────────────────

def test_evaluation_report_exists_and_contains_classes():
    """Verify evaluation report contains metrics for all required categories and priorities."""
    assert os.path.exists(EVAL_REPORT_PATH), "Evaluation report file missing"
    with open(EVAL_REPORT_PATH, 'r') as f:
        report = json.load(f)

    cat_metrics = report.get('category_metrics', {})
    pri_metrics = report.get('priority_metrics', {})

    # Check all categories exist in report
    for cat in CATEGORIES:
        assert cat in cat_metrics, f"Category {cat} missing from evaluation metrics"
        assert 'f1-score' in cat_metrics[cat]
        assert 'precision' in cat_metrics[cat]
        assert 'recall' in cat_metrics[cat]

    # Check all priorities exist in report
    for pri in PRIORITIES:
        assert pri in pri_metrics, f"Priority {pri} missing from evaluation metrics"
        assert 'f1-score' in pri_metrics[pri]
        assert 'precision' in pri_metrics[pri]
        assert 'recall' in pri_metrics[pri]

    # Check macro-average F1 scores
    assert 'macro avg' in cat_metrics
    assert 'macro avg' in pri_metrics
    assert cat_metrics['macro avg']['f1-score'] >= 0.80
    assert pri_metrics['macro avg']['f1-score'] >= 0.80


# ── 3. Pipeline Inference Tests ───────────────────────────────────────────────

def test_category_predictions():
    """Verify inference maps realistic inputs to expected categories."""
    cat_pipe = joblib.load(CAT_MODEL_PATH)

    tech_pred = cat_pipe.predict(["PostgreSQL fatal connection timeout and 500 error"])[0]
    billing_pred = cat_pipe.predict(["Charged twice for monthly invoice #9401 on credit card"])[0]
    auth_pred = cat_pipe.predict(["Cannot log in, two-factor authentication OTP code not arriving"])[0]
    gen_pred = cat_pipe.predict(["What is the release date for the upcoming mobile app?"])[0]

    assert tech_pred == 'Technical Issue'
    assert billing_pred == 'Billing'
    assert auth_pred == 'Account Access'
    assert gen_pred == 'General Inquiry'


def test_priority_predictions():
    """Verify urgency cues guide priority predictions."""
    pri_pipe = joblib.load(PRI_MODEL_PATH)

    high_pred = pri_pipe.predict(["CRITICAL: Production server is completely down and revenue halted"])[0]
    low_pred = pri_pipe.predict(["No rush at all, just a minor question when you have time"])[0]

    assert high_pred == 'High'
    assert low_pred == 'Low'


# ── 4. Flask API Microservice Tests ───────────────────────────────────────────

def test_flask_health_endpoint(client):
    """Verify GET /health returns 200 with service status."""
    res = client.get('/health')
    assert res.status_code == 200
    data = res.get_json()
    assert data['status'] == 'ok'
    assert data['models_loaded'] is True


def test_flask_predict_endpoint_success(client):
    """Verify POST /predict returns predicted category, priority, and confidence."""
    payload = {
        'title': 'Database deadlock on checkout transaction',
        'description': 'CRITICAL: The production PostgreSQL instance is locking tables. All customer checkouts failing.'
    }
    res = client.post('/predict', json=payload)
    assert res.status_code == 200
    data = res.get_json()

    assert data['category'] in CATEGORIES
    assert data['priority'] in PRIORITIES
    assert 0.0 <= data['confidence'] <= 1.0
    assert data['category'] == 'Technical Issue'
    assert data['priority'] == 'High'


def test_flask_predict_validation_errors(client):
    """Verify POST /predict returns 400 when title and description are missing."""
    # Empty body
    res = client.post('/predict', json={})
    assert res.status_code == 400
    assert 'error' in res.get_json()

    # Empty strings
    res = client.post('/predict', json={'title': '   ', 'description': ''})
    assert res.status_code == 400
    assert 'error' in res.get_json()
