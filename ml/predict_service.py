"""
ml/predict_service.py
---------------------
Flask microservice exposing HTTP inference endpoints for Smart Support Desk:
  GET  /health  -> Health check
  POST /predict -> Predicts category, priority, and confidence from title & description

Loads the trained scikit-learn model pipelines exported by ml/train.py.
Runs on port 5001 by default.
"""

import os
import joblib
from flask import Flask, request, jsonify

app = Flask(__name__)

# Resolve path to serialized models
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(SCRIPT_DIR, 'models')
CAT_MODEL_PATH = os.path.join(MODELS_DIR, 'category_model.joblib')
PRI_MODEL_PATH = os.path.join(MODELS_DIR, 'priority_model.joblib')

category_pipeline = None
priority_pipeline = None


def load_models():
    """Loads joblib model artifacts into memory on startup."""
    global category_pipeline, priority_pipeline
    if os.path.exists(CAT_MODEL_PATH) and os.path.exists(PRI_MODEL_PATH):
        category_pipeline = joblib.load(CAT_MODEL_PATH)
        priority_pipeline = joblib.load(PRI_MODEL_PATH)
        print("ML models loaded successfully.")
    else:
        print("Warning: Model files not found. Run `python ml/train.py` first.")


# Pre-load models upon module import
load_models()


@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'ok',
        'service': 'ml-predict',
        'models_loaded': category_pipeline is not None and priority_pipeline is not None
    }), 200


@app.route('/predict', methods=['POST'])
def predict():
    if category_pipeline is None or priority_pipeline is None:
        return jsonify({'error': 'Models not loaded on server'}), 503

    data = request.get_json(silent=True)
    if not data or not isinstance(data, dict):
        return jsonify({'error': 'Invalid request body. Expected JSON object.'}), 400

    title = str(data.get('title', '')).strip()
    description = str(data.get('description', '')).strip()

    if not title and not description:
        return jsonify({'error': 'Either title or description is required for prediction.'}), 400

    # Combine title and description into feature text string
    feature_text = f"{title} {description}".strip()

    # Inference for category & confidence
    predicted_category = category_pipeline.predict([feature_text])[0]
    probabilities = category_pipeline.predict_proba([feature_text])[0]
    max_confidence = float(max(probabilities))

    # Inference for priority
    predicted_priority = priority_pipeline.predict([feature_text])[0]

    return jsonify({
        'category': str(predicted_category),
        'priority': str(predicted_priority),
        'confidence': round(max_confidence, 2)
    }), 200


if __name__ == '__main__':
    port = int(os.environ.get('ML_PORT', 5001))
    print(f"Starting ML prediction microservice on port {port}...")
    app.run(host='0.0.0.0', port=port, debug=False)
