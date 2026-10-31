import os
import io
import csv
import uuid
import random
from datetime import datetime
from flask import Flask, render_template, jsonify, request, Response

from sdt_analysis import (
    calculate_sdt,
    calculate_roc_from_confidence,
    generate_theoretical_roc,
    generate_simulated_subject,
    generate_academic_interpretations
)

app = Flask(__name__)
app.config['SECRET_KEY'] = 'sdt-assignment-1-secret-key-2026'

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
WORD_FILE_PATH = os.path.join(BASE_DIR, 'word.txt')


def load_word_pool():
    """Load and sanitize unique word list from word.txt."""
    if not os.path.exists(WORD_FILE_PATH):
        # Fallback list of 40 words if file is missing
        return [
            "River", "Chair", "Lake", "Book", "Bottle", "Clock", "Brick", "Ladder",
            "Gate", "Poster", "Tire", "Banana", "Pipe", "Apple", "Bucket", "Umbrella",
            "Glass", "Window", "Grill", "Shirt", "Tree", "Flower", "Mountain", "Towel",
            "Camera", "Mirror", "Coin", "Ring", "Pen", "Corner", "Coffee", "Marble",
            "Cream", "Stone", "Dragon", "Pencil", "Feather", "Finger", "Grass", "Hammer"
        ]
    with open(WORD_FILE_PATH, 'r', encoding='utf-8') as f:
        words = [line.strip().capitalize() for line in f if line.strip()]
    # Deduplicate while preserving order
    return list(dict.fromkeys(words))


WORD_POOL = load_word_pool()


@app.route('/')
def index():
    """Render the main experiment web application."""
    return render_template('index.html', total_words=len(WORD_POOL))


@app.route('/api/words', methods=['GET'])
def get_words():
    """Return summary information about the loaded word pool."""
    return jsonify({
        'total_words': len(WORD_POOL),
        'sample': WORD_POOL[:15]
    })


@app.route('/api/create-experiment', methods=['POST'])
def create_experiment():
    """
    Build a randomized experiment configuration with multiple set sizes.
    Ensures targets and lures are uniquely sampled without replacement.
    """
    data = request.get_json() or {}
    subject_name = data.get('subject_name', 'Subject_1').strip() or 'Subject_1'
    set_sizes = data.get('set_sizes', [4, 8, 12, 16])
    presentation_mode = data.get('presentation_mode', 'sequential') # 'sequential' | 'cloud'
    word_duration_ms = int(data.get('word_duration_ms', 1500))
    response_mode = data.get('response_mode', 'confidence') # 'confidence' | 'binary'

    # Filter and sort set sizes
    cleaned_set_sizes = []
    for s in set_sizes:
        try:
            val = int(s)
            if 2 <= val <= 30:
                cleaned_set_sizes.append(val)
        except (ValueError, TypeError):
            continue
    if not cleaned_set_sizes:
        cleaned_set_sizes = [4, 8, 12, 16]
    cleaned_set_sizes.sort()

    # Total words needed = sum(2 * set_size)
    total_needed = sum(2 * s for s in cleaned_set_sizes)
    
    # Shuffle entire word pool to sample without replacement
    shuffled_pool = list(WORD_POOL)
    random.shuffle(shuffled_pool)

    # If the requested experiment requires more words than available, recycle randomly
    if total_needed > len(shuffled_pool):
        multiplier = (total_needed // len(shuffled_pool)) + 2
        shuffled_pool = (WORD_POOL * multiplier)
        random.shuffle(shuffled_pool)

    blocks = []
    pool_idx = 0

    for s_idx, set_size in enumerate(cleaned_set_sizes):
        # Sample targets (words to memorize)
        targets = shuffled_pool[pool_idx: pool_idx + set_size]
        pool_idx += set_size

        # Sample lures (new distractor words not in study list)
        lures = shuffled_pool[pool_idx: pool_idx + set_size]
        pool_idx += set_size

        # Test phase items: mix of targets and lures
        test_items = []
        for word in targets:
            test_items.append({"word": word, "is_target": True})
        for word in lures:
            test_items.append({"word": word, "is_target": False})

        random.shuffle(test_items)

        blocks.append({
            "block_number": s_idx + 1,
            "set_size": set_size,
            "study_words": targets,
            "test_items": test_items
        })

    experiment_plan = {
        "experiment_id": str(uuid.uuid4()),
        "subject_name": subject_name,
        "date": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "presentation_mode": presentation_mode,
        "word_duration_ms": word_duration_ms,
        "response_mode": response_mode,
        "set_sizes": cleaned_set_sizes,
        "total_blocks": len(blocks),
        "blocks": blocks
    }

    return jsonify(experiment_plan)


@app.route('/api/analyze', methods=['POST'])
def analyze_experiment():
    """
    Process experimental results, compute Signal Detection Theory metrics,
    ROC curves, psychophysical functions, and generate academic answers.
    """
    data = request.get_json() or {}
    subject_name = data.get('subject_name', 'Participant')
    blocks_input = data.get('blocks', [])

    if not blocks_input:
        return jsonify({"error": "No experimental blocks provided for analysis"}), 400

    processed_blocks = []

    for block in blocks_input:
        set_size = int(block.get('set_size', 0))
        study_words = block.get('study_words', [])
        trials = block.get('trials', [])

        target_ratings = []
        lure_ratings = []
        hits = 0
        misses = 0
        false_alarms = 0
        correct_rejections = 0
        reaction_times = []

        for trial in trials:
            is_target = bool(trial.get('is_target', False))
            rt = float(trial.get('reaction_time_ms', 0))
            if rt > 0:
                reaction_times.append(rt)

            # Check if rating scale (1-6) or direct binary response
            if 'rating' in trial and trial['rating'] is not None:
                rating = int(trial['rating'])
                # Rating >= 4 is 'Yes' (Old), < 4 is 'No' (New)
                response_yes = (rating >= 4)
                if is_target:
                    target_ratings.append(rating)
                else:
                    lure_ratings.append(rating)
            else:
                response_yes = bool(trial.get('response_yes', False))
                # Synthetic rating for ROC fallback
                pseudo_rating = 5 if response_yes else 2
                if is_target:
                    target_ratings.append(pseudo_rating)
                else:
                    lure_ratings.append(pseudo_rating)

            if is_target and response_yes:
                hits += 1
            elif is_target and not response_yes:
                misses += 1
            elif not is_target and response_yes:
                false_alarms += 1
            elif not is_target and not response_yes:
                correct_rejections += 1

        sdt_summary = calculate_sdt(hits, misses, false_alarms, correct_rejections)
        roc_data = calculate_roc_from_confidence(target_ratings, lure_ratings)
        theoretical_roc = generate_theoretical_roc(sdt_summary['d_prime'])
        mean_rt = round(sum(reaction_times) / len(reaction_times), 1) if reaction_times else 0.0

        processed_blocks.append({
            "set_size": set_size,
            "study_words": study_words,
            "trials": trials,
            "summary": sdt_summary,
            "roc": roc_data,
            "theoretical_roc": theoretical_roc,
            "mean_reaction_time_ms": mean_rt
        })

    interpretations = generate_academic_interpretations(processed_blocks)

    return jsonify({
        "subject_name": subject_name,
        "date": data.get("date", datetime.now().strftime("%Y-%m-%d %H:%M:%S")),
        "blocks": processed_blocks,
        "interpretations": interpretations
    })


@app.route('/api/simulate', methods=['POST', 'GET'])
def simulate():
    """
    Instantly returns high-fidelity simulated human performance data
    adhering to cognitive psychology memory capacity models.
    """
    data = request.get_json(silent=True) or {}
    set_sizes = data.get('set_sizes', [4, 8, 12, 16])
    result = generate_simulated_subject(set_sizes, WORD_POOL)
    return jsonify(result)


@app.route('/api/import', methods=['POST'])
def import_experiment_data():
    """
    Import and re-analyze previously exported experiment data.
    Accepts full results or raw trial blocks.
    """
    data = request.get_json() or {}
    if not data or 'blocks' not in data:
        return jsonify({"error": "Invalid experiment data file. 'blocks' field required."}), 400
    
    # If blocks already have summary and roc calculated, return directly
    first_block = data['blocks'][0] if len(data['blocks']) > 0 else {}
    if 'summary' in first_block and 'roc' in first_block:
        if 'interpretations' not in data:
            data['interpretations'] = generate_academic_interpretations(data['blocks'])
        return jsonify(data)
    
    # Otherwise analyze through standard pipeline
    return analyze_experiment()


@app.route('/api/export-csv', methods=['POST'])
def export_csv():
    """Generate a downloadable CSV file of all raw trial-by-trial responses."""
    data = request.get_json() or {}
    subject_name = data.get('subject_name', 'Subject')
    blocks = data.get('blocks', [])

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Subject",
        "Set_Size",
        "Trial_Index",
        "Word",
        "Trial_Type",
        "Subject_Response",
        "Confidence_Rating",
        "Correct",
        "Reaction_Time_MS"
    ])

    for b_idx, block in enumerate(blocks):
        set_size = block.get('set_size', 'NA')
        trials = block.get('trials', [])
        for t_idx, trial in enumerate(trials):
            is_target = trial.get('is_target', False)
            trial_type = "Target (Old)" if is_target else "Lure (New)"
            rating = trial.get('rating', '')
            response_yes = trial.get('response_yes', rating >= 4 if rating != '' else False)
            resp_str = "YES (Old)" if response_yes else "NO (New)"
            correct = (is_target and response_yes) or (not is_target and not response_yes)
            rt = trial.get('reaction_time_ms', '')

            writer.writerow([
                subject_name,
                set_size,
                t_idx + 1,
                trial.get('word', ''),
                trial_type,
                resp_str,
                rating,
                1 if correct else 0,
                rt
            ])

    filename = f"sdt_experiment_{subject_name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    return Response(
        output.getvalue(),
        mimetype="text/csv",
        headers={"Content-disposition": f"attachment; filename={filename}"}
    )


if __name__ == '__main__':
    # Default local dev port 5001 or 5000
    port = int(os.environ.get('PORT', 5001))
    print(f"Starting Signal Detection Theory Flask App on http://127.0.0.1:{port}")
    app.run(host='0.0.0.0', port=port, debug=True)
