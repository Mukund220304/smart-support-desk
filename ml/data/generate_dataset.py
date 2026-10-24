"""
ml/data/generate_dataset.py
---------------------------
Generates a reproducible, realistically labeled synthetic dataset of support tickets.
Features:
  - Categories: Technical Issue, Billing, Account Access, General Inquiry
  - Priorities: Low, Medium, High
  - Deterministic: Seeds random and numpy for 100% reproducibility across runs.
  - Near-duplicate filtering: Computes token-level Jaccard similarity to prune any
    samples exceeding 0.75 similarity threshold, preventing dataset redundancy.
  - Outputs: ml/data/tickets_dataset.csv
"""

import os
import random
import re
import numpy as np
import pandas as pd

# Set fixed random seeds for deterministic reproducibility
SEED = 42
random.seed(SEED)
np.random.seed(SEED)

CATEGORIES = [
    'Technical Issue',
    'Billing',
    'Account Access',
    'General Inquiry',
]

PRIORITIES = ['Low', 'Medium', 'High']

# Domain-specific vocabulary components
TECHNICAL_SUBJECTS = [
    ("Database connection pool exhausted", "PostgreSQL database throws FATAL: remaining connection slots are reserved. Backend queries are timing out."),
    ("500 Internal Server Error on API endpoint", "The /api/v1/checkout endpoint returns 500 error code on POST requests with JSON payload."),
    ("Memory leak in background processing worker", "The Celery worker memory consumption continuously grows until the kernel OOM killer terminates the container."),
    ("Websocket connection drops intermittently", "Client receives close frame 1006 every few minutes. Reconnect logic causes cascading reconnect storms."),
    ("Frontend bundle failed to compile in CI/CD pipeline", "Vite build fails with 'SyntaxError: Unexpected token' after dependency upgrade to latest version."),
    ("CPU utilization spike to 100%", "Production Kubernetes cluster nodes exhibit constant 100% CPU utilization across all pods in the namespace."),
    ("Redis cache eviction latency spike", "Redis server response times climbed from 2ms to 450ms due to heavy memory fragmentation."),
    ("SSL certificate handshake failure", "Browser reports ERR_SSL_VERSION_OR_CIPHER_MISMATCH when connecting via HTTPS on our custom domain."),
    ("Data ingestion pipeline stalled", "Kafka consumer group has a growing lag of over 50,000 uncommitted messages."),
    ("Microservice timeout during distributed transaction", "Order placement service times out waiting for inventory validation gRPC call."),
    ("File upload returns HTTP 413 Payload Too Large", "Users cannot upload standard PDF attachments above 5MB even though quota is set to 25MB."),
    ("Docker container in CrashLoopBackOff", "The main backend container restarts continually with exit code 137 in production environment."),
]

BILLING_SUBJECTS = [
    ("Double charge on monthly subscription invoice", "My credit card was charged twice for the enterprise license on the same billing cycle."),
    ("Incorrect sales tax rate applied to invoice", "The tax rate on invoice #INV-8492 is calculated at 12% instead of the standard 5% for our registered state."),
    ("Refund not received after cancellation", "Cancelled the annual subscription during the 30-day money-back window 14 days ago, but funds have not posted."),
    ("Payment failed due to 3D Secure verification", "The checkout process fails at Stripe 3D Secure verification modal with error card_declined."),
    ("Request for updated VAT invoice for company audit", "Our accounting department requires an amended invoice showing our European Union VAT ID number."),
    ("Overcharged for add-on team seats", "We removed 4 user seats three weeks ago but the current bill still reflects the previous higher seat count."),
    ("Credit card update page returns validation error", "When trying to replace an expiring Mastercard, the billing portal displays 'Unable to update payment method'."),
    ("Enterprise pricing agreement discrepancy", "Our annual contract stipulates a 20% volume discount, but the latest bill is billed at full standard retail rate."),
    ("Unexpected charges for API overage", "We received a bill for $420 in overage fees despite staying within our committed rate limits."),
    ("Currency conversion discrepancy on receipt", "The transaction was processed in GBP instead of EUR as configured in our billing preferences."),
]

ACCOUNT_ACCESS_SUBJECTS = [
    ("Two-factor authentication code not received via SMS", "SMS OTP verification code is not being delivered to my registered phone number after multiple attempts."),
    ("Locked out of account after multiple failed attempts", "My account has been locked due to incorrect password attempts. Need administrative unlock immediately."),
    ("Password reset email link expired immediately", "The password reset link received in my email says 'token expired' as soon as I click it."),
    ("SSO SAML login fails with assertion error", "Okta Single Sign-On integration fails with error 'Invalid SAML response signature' for all enterprise users."),
    ("Cannot revoke permissions for former employee", "Attempting to deactivate user account results in error 'User cannot be removed while active in team'."),
    ("Authenticator app desynchronized", "Google Authenticator 6-digit TOTP codes are consistently rejected as invalid during login."),
    ("Invitation link for new team member not working", "Newly invited team members receive a blank page when opening the workspace invitation link."),
    ("Session timeout too aggressive on dashboard", "The user session expires and logs out every 3 minutes of inactivity instead of the configured 8 hours."),
    ("Admin privileges lost after role modification", "My account was changed to viewer role mistakenly and no one else in our company has owner access."),
    ("Google OAuth login redirects to blank page", "Clicking 'Sign in with Google' opens a blank popup window without completing the auth flow."),
]

GENERAL_INQUIRY_SUBJECTS = [
    ("Question regarding data export capabilities", "Does your platform support automated daily exports of ticket history to Amazon S3 or Google Cloud Storage?"),
    ("Inquiry about upcoming feature roadmap", "Is there an estimated timeline for the release of the native mobile application for iOS and Android?"),
    ("Assistance with webhook payload documentation", "Could you provide sample JSON schemas for ticket created and ticket resolved webhook events?"),
    ("Question about SLA guarantees on standard tier", "What are the guaranteed uptime and support response time SLAs for organizations on the pro plan?"),
    ("Request for product demonstration for executive team", "We would like to schedule a 30-minute demonstration of the analytics dashboard for our VP of Operations."),
    ("Inquiry regarding GDPR compliance and data residency", "Can you confirm whether customer support data can be stored exclusively within EU-West AWS data centers?"),
    ("Information on bulk ticket import from Zendesk", "We are migrating from Zendesk and would like guidance on how to import our historical CSV ticket records."),
    ("Feedback on new dark mode interface", "Just wanted to share feedback that the contrast in the new dark mode theme is very comfortable for night shifts."),
    ("Question about custom email domain integration", "Is it possible to send ticket notifications using our own custom domain email address via DKIM/SPF?"),
    ("Clarification on user role definitions", "What is the exact distinction between the Contributor and Manager permission levels in the knowledge base?"),
]

# Priority linguistic cues
HIGH_PRIORITY_CUES = [
    "CRITICAL: Production is completely down affecting all customers.",
    "URGENT: This is blocking our quarterly release deadline today.",
    "High severity impact: Revenue generating operations are completely stalled.",
    "Immediate escalation required. Our executives are monitoring this issue.",
    "All users are locked out and unable to conduct business. Need immediate resolution.",
    "Severe data loss risk if not addressed within the hour.",
]

MEDIUM_PRIORITY_CUES = [
    "This affects a subset of our internal team during daily workflow.",
    "A temporary workaround exists, but this creates significant friction.",
    "Please look into this when possible today as it impacts multiple users.",
    "Moderate impact on our customer service response times.",
    "We need this resolved before our upcoming billing cycle next week.",
]

LOW_PRIORITY_CUES = [
    "No immediate rush, just wanted to check on this when someone has time.",
    "Minor cosmetic issue or general inquiry with low impact.",
    "Whenever you have a moment, any guidance would be appreciated.",
    "Low priority request for future planning purposes.",
    "Take your time, this is not urgent or blocking any active workflows.",
]

VARIATION_PHRASES = [
    "Please let us know how to resolve this.",
    "Looking forward to your prompt assistance.",
    "We noticed this behavior starting early this morning.",
    "Can you please review the attached details and advise?",
    "Has anyone else reported similar behavior recently?",
    "Any pointers on the best way to address this would be greatly appreciated.",
    "Thank you in advance for your help.",
    "We have already tried clearing the cache and restarting the application.",
]


def tokenize(text):
    """Simple lowercase word tokenizer for Jaccard similarity."""
    return set(re.findall(r'\b[a-zA-Z]{3,}\b', text.lower()))


def jaccard_similarity(set_a, set_b):
    """Calculates Jaccard index between two token sets."""
    if not set_a or not set_b:
        return 0.0
    intersection = len(set_a.intersection(set_b))
    union = len(set_a.union(set_b))
    return intersection / union if union > 0 else 0.0


def generate_ticket(category, priority):
    """Generates a single synthetic ticket combining subject, priority cues, and variations."""
    if category == 'Technical Issue':
        title_base, desc_base = random.choice(TECHNICAL_SUBJECTS)
    elif category == 'Billing':
        title_base, desc_base = random.choice(BILLING_SUBJECTS)
    elif category == 'Account Access':
        title_base, desc_base = random.choice(ACCOUNT_ACCESS_SUBJECTS)
    else:
        title_base, desc_base = random.choice(GENERAL_INQUIRY_SUBJECTS)

    if priority == 'High':
        pri_cue = random.choice(HIGH_PRIORITY_CUES)
    elif priority == 'Medium':
        pri_cue = random.choice(MEDIUM_PRIORITY_CUES)
    else:
        pri_cue = random.choice(LOW_PRIORITY_CUES)

    variation = random.choice(VARIATION_PHRASES)

    # Vary title prefix/suffix
    prefixes = ["", "Issue: ", "Support Request: ", "Ticket: ", "Urgent: " if priority == 'High' else "Question: "]
    title = f"{random.choice(prefixes)}{title_base}"

    # Assemble description
    desc_parts = [desc_base, pri_cue, variation]
    if random.random() > 0.5:
        desc_parts.append(f"Ticket ID ref: #{random.randint(1000, 9999)}.")
    description = " ".join(desc_parts)

    return title, description


def generate_dataset(target_samples_per_cell=100, max_jaccard=0.75):
    """
    Generates a balanced dataset:
    4 categories * 3 priorities * target_samples_per_cell = ~1,200 samples.
    Filters near-duplicates using Jaccard similarity.
    """
    rows = []
    seen_token_sets = []

    print(f"Generating synthetic dataset (~{4 * 3 * target_samples_per_cell} target samples)...")

    for category in CATEGORIES:
        for priority in PRIORITIES:
            collected = 0
            attempts = 0
            while collected < target_samples_per_cell and attempts < target_samples_per_cell * 10:
                attempts += 1
                title, description = generate_ticket(category, priority)
                tokens = tokenize(title + " " + description)

                # Check near-duplicate threshold against existing samples in this category
                is_duplicate = False
                for existing_tokens in seen_token_sets:
                    if jaccard_similarity(tokens, existing_tokens) >= max_jaccard:
                        is_duplicate = True
                        break

                if not is_duplicate:
                    rows.append({
                        'title': title,
                        'description': description,
                        'category': category,
                        'priority': priority,
                    })
                    seen_token_sets.append(tokens)
                    collected += 1

    df = pd.DataFrame(rows)
    # Shuffle deterministically
    df = df.sample(frac=1.0, random_state=SEED).reset_index(drop=True)

    print(f"Dataset generated: {len(df)} total tickets.")
    print("Class distribution by category:\n", df['category'].value_counts())
    print("\nClass distribution by priority:\n", df['priority'].value_counts())

    return df


if __name__ == '__main__':
    dataset_dir = os.path.dirname(os.path.abspath(__file__))
    output_path = os.path.join(dataset_dir, 'tickets_dataset.csv')
    df = generate_dataset(target_samples_per_cell=100)
    df.to_csv(output_path, index=False)
    print(f"\nSaved dataset to: {output_path}")
