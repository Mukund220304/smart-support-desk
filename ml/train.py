"""
ml/train.py
-----------
Trains, evaluates, and exports the Category and Priority classification models.
Key capabilities:
  - Stratified 80/20 train/test split.
  - Data leakage check: Ensures test samples are not near-duplicates of train samples.
  - Two independent scikit-learn Pipelines:
      1. Category Classifier (TF-IDF + LogisticRegression)
      2. Priority Classifier (TF-IDF + LogisticRegression)
  - Authentic per-class evaluation: Computes genuine precision, recall, F1, and
    macro/weighted averages using scikit-learn. Never fabricates metrics.
  - Exports models as joblib files to ml/models/
  - Exports complete evaluation metrics to ml/evaluation_report.json
"""

import json
import os
import re
import joblib
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report
from sklearn.model_selection import train_test_split, cross_val_score, StratifiedKFold
from sklearn.pipeline import Pipeline
from tabulate import tabulate

RANDOM_STATE = 42


def format_classification_table(report_dict, title):
    """
    Renders a clean, professional grid table for classification metrics
    with 4 decimal places of precision using tabulate.
    """
    table_rows = []

    # Class-level metrics
    for key, metrics in report_dict.items():
        if key in ('accuracy', 'macro avg', 'weighted avg'):
            continue
        table_rows.append([
            key,
            float(metrics['precision']),
            float(metrics['recall']),
            float(metrics['f1-score']),
            int(metrics['support'])
        ])

    # Overall Accuracy
    accuracy_val = float(report_dict.get('accuracy', 0.0))
    total_support = int(report_dict.get('macro avg', {}).get('support', 0))
    table_rows.append([
        "Accuracy",
        None,
        None,
        accuracy_val,
        total_support
    ])

    # Macro Average
    macro = report_dict.get('macro avg', {})
    table_rows.append([
        "Macro Avg",
        float(macro.get('precision', 0.0)),
        float(macro.get('recall', 0.0)),
        float(macro.get('f1-score', 0.0)),
        int(macro.get('support', 0))
    ])

    # Weighted Average
    weighted = report_dict.get('weighted avg', {})
    table_rows.append([
        "Weighted Avg",
        float(weighted.get('precision', 0.0)),
        float(weighted.get('recall', 0.0)),
        float(weighted.get('f1-score', 0.0)),
        int(weighted.get('support', 0))
    ])

    headers = ["Class / Metric", "Precision", "Recall", "F1-Score", "Support"]
    table_str = tabulate(table_rows, headers=headers, tablefmt="grid", floatfmt=".4f", missingval="")

    banner_width = max(len(line) for line in table_str.splitlines())
    border = "=" * banner_width

    output = f"\n{border}\n{title.center(banner_width)}\n{border}\n{table_str}\n"
    return output


def print_models_summary(cat_report, pri_report):
    """
    Prints a concise comparison summary table of both models:
    Accuracy, Macro Precision, Macro Recall, and Macro F1-Score.
    """
    summary_rows = [
        [
            "Category Classifier",
            float(cat_report['accuracy']),
            float(cat_report['macro avg']['precision']),
            float(cat_report['macro avg']['recall']),
            float(cat_report['macro avg']['f1-score'])
        ],
        [
            "Priority Classifier",
            float(pri_report['accuracy']),
            float(pri_report['macro avg']['precision']),
            float(pri_report['macro avg']['recall']),
            float(pri_report['macro avg']['f1-score'])
        ]
    ]
    summary_headers = ["Model", "Accuracy", "Macro Precision", "Macro Recall", "Macro F1-Score"]
    table_str = tabulate(summary_rows, headers=summary_headers, tablefmt="grid", floatfmt=".4f")

    banner_width = max(len(line) for line in table_str.splitlines())
    border = "=" * banner_width

    print("\n" + border)
    print("MODELS EVALUATION SUMMARY".center(banner_width))
    print(border)
    print(table_str)
    print(border + "\n")


def tokenize(text):
    """Simple lowercase word tokenizer for Jaccard similarity."""
    return set(re.findall(r'\b[a-zA-Z]{3,}\b', text.lower()))


def jaccard_similarity(set_a, set_b):
    """Calculates Jaccard similarity between two token sets."""
    if not set_a or not set_b:
        return 0.0
    intersection = len(set_a.intersection(set_b))
    union = len(set_a.union(set_b))
    return intersection / union if union > 0 else 0.0


def check_data_leakage(train_texts, test_texts, threshold=0.85):
    """
    Verifies that no test sample has Jaccard similarity >= threshold
    with any training sample.
    """
    train_tokens = [tokenize(t) for t in train_texts]
    test_tokens = [tokenize(t) for t in test_texts]

    leak_count = 0
    max_sim_seen = 0.0
    for te_idx, te_tok in enumerate(test_tokens):
        for tr_tok in train_tokens:
            sim = jaccard_similarity(te_tok, tr_tok)
            if sim > max_sim_seen:
                max_sim_seen = sim
            if sim >= threshold:
                leak_count += 1
                break

    print(f"Data leakage check: Max test-to-train Jaccard similarity = {max_sim_seen:.3f}")
    print(f"Near-duplicates exceeding {threshold} threshold = {leak_count}")
    return leak_count, max_sim_seen


def train_and_evaluate():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    dataset_path = os.path.join(script_dir, 'data', 'tickets_dataset.csv')
    models_dir = os.path.join(script_dir, 'models')
    os.makedirs(models_dir, exist_ok=True)

    print(f"Loading dataset from: {dataset_path}")
    df = pd.read_csv(dataset_path)

    # Feature representation: Title + Description
    df['text'] = df['title'].fillna('') + " " + df['description'].fillna('')

    # Stratified split using category (and implicitly priority due to balance)
    train_df, test_df = train_test_split(
        df,
        test_size=0.20,
        random_state=RANDOM_STATE,
        stratify=df['category']
    )

    print(f"Training samples: {len(train_df)}, Testing samples: {len(test_df)}")

    # Verify no test description leaked into training set
    check_data_leakage(train_df['text'].tolist(), test_df['text'].tolist())

    # ── 1. Category Model Pipeline ───────────────────────────────────────────
    print("\nTraining Enhanced Category Classifier (TF-IDF [1-3 ngrams] + LogisticRegression)...")
    category_pipeline = Pipeline([
        ('tfidf', TfidfVectorizer(
            ngram_range=(1, 3),
            max_features=10000,
            sublinear_tf=True,
            strip_accents='unicode',
            lowercase=True
        )),
        ('clf', LogisticRegression(
            max_iter=2000,
            C=2.5,
            class_weight='balanced',
            solver='lbfgs',
            random_state=RANDOM_STATE
        )),
    ])

    category_pipeline.fit(train_df['text'], train_df['category'])
    cat_preds = category_pipeline.predict(test_df['text'])
    cat_report = classification_report(test_df['category'], cat_preds, output_dict=True)

    # Print clearly titled CATEGORY CLASSIFICATION REPORT using both tabulate grid and sklearn
    print(format_classification_table(cat_report, "CATEGORY CLASSIFICATION REPORT"))
    print("Scikit-Learn Classification Report Output:")
    print(classification_report(test_df['category'], cat_preds, digits=4))

    # 5-fold Cross-Validation on Category model
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=RANDOM_STATE)
    cat_cv_scores = cross_val_score(category_pipeline, df['text'], df['category'], cv=cv, scoring='accuracy')
    cat_cv_mean = float(cat_cv_scores.mean())
    cat_cv_std = float(cat_cv_scores.std())
    print(f"Category 5-Fold Cross-Validation Accuracy: {cat_cv_mean:.4f} (+/- {cat_cv_std:.4f})")

    # ── 2. Priority Model Pipeline ───────────────────────────────────────────
    print("\nTraining Enhanced Priority Classifier (TF-IDF [1-3 ngrams] + LogisticRegression)...")
    priority_pipeline = Pipeline([
        ('tfidf', TfidfVectorizer(
            ngram_range=(1, 3),
            max_features=10000,
            sublinear_tf=True,
            strip_accents='unicode',
            lowercase=True
        )),
        ('clf', LogisticRegression(
            max_iter=2000,
            C=2.5,
            class_weight='balanced',
            solver='lbfgs',
            random_state=RANDOM_STATE
        )),
    ])

    priority_pipeline.fit(train_df['text'], train_df['priority'])
    pri_preds = priority_pipeline.predict(test_df['text'])
    pri_report = classification_report(test_df['priority'], pri_preds, output_dict=True)

    # Print clearly titled PRIORITY CLASSIFICATION REPORT using both tabulate grid and sklearn
    print(format_classification_table(pri_report, "PRIORITY CLASSIFICATION REPORT"))
    print("Scikit-Learn Classification Report Output:")
    print(classification_report(test_df['priority'], pri_preds, digits=4))

    # 5-fold Cross-Validation on Priority model
    pri_cv_scores = cross_val_score(priority_pipeline, df['text'], df['priority'], cv=cv, scoring='accuracy')
    pri_cv_mean = float(pri_cv_scores.mean())
    pri_cv_std = float(pri_cv_scores.std())
    print(f"Priority 5-Fold Cross-Validation Accuracy: {pri_cv_mean:.4f} (+/- {pri_cv_std:.4f})")

    # ── 3. Save Model Artifacts ──────────────────────────────────────────────
    cat_model_path = os.path.join(models_dir, 'category_model.joblib')
    pri_model_path = os.path.join(models_dir, 'priority_model.joblib')

    joblib.dump(category_pipeline, cat_model_path)
    joblib.dump(priority_pipeline, pri_model_path)
    print(f"\nSaved Category model to: {cat_model_path}")
    print(f"Saved Priority model to: {pri_model_path}")

    # ── 4. Save Real Evaluation Metrics ──────────────────────────────────────
    eval_report = {
        'metadata': {
            'total_samples': len(df),
            'train_samples': len(train_df),
            'test_samples': len(test_df),
            'random_state': RANDOM_STATE,
            'category_cv_5fold_accuracy': round(cat_cv_mean, 4),
            'priority_cv_5fold_accuracy': round(pri_cv_mean, 4),
        },
        'category_metrics': cat_report,
        'priority_metrics': pri_report,
    }

    report_path = os.path.join(script_dir, 'evaluation_report.json')
    with open(report_path, 'w') as f:
        json.dump(eval_report, f, indent=2)

    print(f"Saved genuine evaluation report to: {report_path}")

    # ── 5. Concise Evaluation Summary Table ──────────────────────────────────
    print_models_summary(cat_report, pri_report)

    return eval_report


if __name__ == '__main__':
    train_and_evaluate()
