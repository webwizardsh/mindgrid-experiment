# Signal Detection Theory: Working Memory Experiment (Assignment 1)
**Centre for Neuroscience, Indian Institute of Science (IISc)**  
*Course Instructor: Prof. Sridhar Devarajan*  
*Assignment 1 — 50 Points*

---

## 📌 Overview

This Flask application is an interactive laboratory tool designed to conduct **Experiment 1 (Working Memory Recognition Task)** using **Signal Detection Theory (SDT)**. It measures human sensitivity ($d'$) and decision bias ($b$ and $c$) as a function of memory set size, generates psychophysical functions, and constructs empirical and theoretical **Receiver Operating Characteristic (ROC)** curves.

---

## 🚀 Quick Start

### 1. Run the Flask Server
Using the existing Python virtual environment:

```bash
./venv/bin/python main.py
```
*(Or with any Python 3.8+ interpreter: `python main.py`)*

### 2. Open in Browser
Navigate to:
```
http://127.0.0.1:5001
```

---

## 🔬 Mathematical Formulas (from Lecture Slide 5)

| Metric | Symbol | Formula | Interpretation |
| :--- | :---: | :--- | :--- |
| **Sensitivity / Discriminability** | $d'$ | $d' = \Phi^{-1}(H) - \Phi^{-1}(F)$ | Separation between signal (targets) and noise (lures) distributions in standard deviation units. |
| **Absolute Criterion** | $c$ | $c = -\Phi^{-1}(F)$ | Distance of decision criterion from the mean of the noise distribution. |
| **Relative Bias** | $b$ | $b = -\frac{\Phi^{-1}(H) + \Phi^{-1}(F)}{2}$ | Criterion relative to the neutral crossover point: $b = 0$ is unbiased, $b > 0$ is conservative, $b < 0$ is liberal. |
| **Likelihood Ratio** | $\beta$ | $\beta = \exp(d' \cdot b)$ | Ratio of likelihood of signal vs noise at the decision cutoff. |

> **Correction for Extreme Rates:** When Hit rate $H = 1.0$ or False Alarm rate $F = 0.0$, the application automatically applies the standard **Hautus (1995) log-linear correction**:  
> $H_{adj} = \frac{\text{Hits} + 0.5}{N_{\text{targets}} + 1.0}$ and $F_{adj} = \frac{\text{FAs} + 0.5}{N_{\text{lures}} + 1.0}$.

---

## 📝 Assignment 1 Questions & Theoretical Answers

### a. Does $d'$ vary with set size? (Psychophysical Function)
- **Finding:** Yes. As the set size increases (e.g. from 4 to 16 items), discriminability ($d'$) systematically decreases.
- **Cognitive Neuroscience Explanation:** Working memory operates under strict attentional and buffer capacity limits (Cowan's 4-chunk limit or Miller's $7 \pm 2$). When the number of memorized items increases, the cognitive resources allocated per item decrease, and inter-item interference accumulates. In SDT terms, the internal familiarity/evidence distribution for studied targets shifts downward closer to the lure (noise) distribution, reducing separation ($d'$).
- **Plot:** The application renders the **Psychophysical Function** ($d'$ plotted as a function of Set Size).

### b. Does bias vary with set size?
- **Finding:** As set size increases, human subjects typically adopt a more **conservative decision criterion** ($b$ and $c$ increase), or maintain neutral calibration while reaction times lengthen.
- **Cognitive Neuroscience Explanation:** Under high cognitive load and uncertainty, participants experience weakened memory traces. To prevent costly false alarms (erroneously claiming a word was studied), they require higher familiarity before committing to a "Yes" response. In SDT, this is captured by positive shifts in $b = -(\Phi^{-1}(H) + \Phi^{-1}(F))/2$.
- **Plot:** The application plots both $b$ (relative bias) and $c$ (absolute criterion) across set sizes.

### c. Construct an ROC and show how it relates to $d'$ (20 Points)
- **The ROC Curve (Receiver Operating Characteristic):** Plots Hit Rate ($H$, True Positives) against False Alarm Rate ($F$, False Positives).
- **Relation to $d'$:** For any fixed sensitivity $d'$, changing the criterion moves the operating point along a fixed iso-sensitivity curve governed by:
  $$H = \Phi\left(\Phi^{-1}(F) + d'\right)$$
  - Higher $d'$ curves bow upward towards the ideal upper-left corner $(0, 1)$.
  - When $d' = 0$ (chance discrimination), the ROC is the $45^\circ$ diagonal line ($H = F$).
- **Answer to the Hint ("How do you ensure that your subject varies her/his criteria?"):**
  1. **Confidence Rating Method (Implemented in this App):** Instead of a simple binary Yes/No response, the subject rates confidence on a 6-point scale (*1 = Definitely New* to *6 = Definitely Old*). Each rating threshold functions as an internal decision criterion:
     - Criterion 1 (Strict): Response $\ge 6$
     - Criterion 2: Response $\ge 5$
     - Criterion 3 (Neutral): Response $\ge 4$
     - Criterion 4: Response $\ge 3$
     - Criterion 5 (Liberal): Response $\ge 2$  
     Computing cumulative Hit and False Alarm rates across these 5 thresholds yields 5 empirical points tracing the participant's empirical ROC curve within a single experiment!
  2. **Payoff Matrix / Asymmetric Instructions Manipulation:** Criteria can also be varied across blocks by altering rewards and penalties (e.g., heavy penalties for false alarms induce a conservative criterion; bonuses for hits induce a liberal criterion).

---

## 💻 App Architecture

```
assigment_1/
├── main.py              # Flask server and REST API endpoints
├── sdt_analysis.py      # Core SDT calculations, statistical corrections & simulation
├── word.txt             # 140+ unique stimulus words pool
├── templates/
│   └── index.html       # Single-page UI (setup, study, test, results)
├── static/
│   ├── css/
│   │   └── style.css    # Modern laboratory aesthetic and print styles
│   └── js/
│       ├── charts.js    # Zero-dependency SVG interactive chart renderer
│       └── app.js       # Stimulus presentation, keyboard controller, timer
├── tests/
│   └── test_sdt.py      # Unit tests for SDT math & API endpoints
├── requirements.txt     # Python dependencies
└── README.md            # Lab guide & theory
```

---

## 🧪 Unit Testing

Run the automated test suite:
```bash
./venv/bin/python -m unittest discover tests
```
*(All 10 tests verify normal quantile symmetry, Hautus edge-case correction, ROC monotonicity, simulation stability, and all Flask endpoints.)*

---

## 📊 Features & Controls

- **Customizable Set Sizes:** Choose any combination (default: 4, 8, 12, 16).
- **Presentation Modes:**
  - *Sequential Flash:* Words flash one-by-one with an animated timer bar (1.0s, 1.5s, 2.0s, 2.5s).
  - *Word Cloud / Board:* All words displayed simultaneously (matching Slide 3 of lecture).
- **Retention Interval:** 2.0s fixation cross to clear sensory memory.
- **Keyboard Shortcuts:** Keys `1` to `6` for confidence ratings, or `Y` / `N` for binary recognition.
- **⚡ Instant Demo Mode:** Generates human-like performance data instantly for testing or grading.
- **Exporting Options:**
  - `📥 Export CSV`: Raw trial-by-trial response logs including RT and accuracy.
  - `🖨️ Print Lab Report`: Formatted scientific report with all tables, charts, and answers.

