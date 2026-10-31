/**
 * MindGrid: Working Memory Challenge & Signal Detection Lab
 * Experiment Controller, Gamification, Sound Synthesizer, Confetti & Data Importer
 */

document.addEventListener('DOMContentLoaded', () => {
  // -------------------------------------------------------------
  // 1. Web Audio API Sound Synthesizer (Zero external dependencies)
  // -------------------------------------------------------------
  const AudioEngine = {
    ctx: null,
    enabled: true,

    init() {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) this.ctx = new AudioCtx();
      }
    },

    toggle() {
      this.enabled = !this.enabled;
      return this.enabled;
    },

    playTone(freq, type = 'sine', duration = 0.15, gainVal = 0.08) {
      if (!this.enabled) return;
      try {
        this.init();
        if (this.ctx && this.ctx.state === 'suspended') {
          this.ctx.resume();
        }
        if (!this.ctx) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + duration);
      } catch (e) {}
    },

    playClick() {
      this.playTone(480, 'sine', 0.04, 0.04);
    },

    playWordFlash() {
      this.playTone(330, 'triangle', 0.08, 0.05);
    },

    playResponse() {
      this.playTone(587.33, 'triangle', 0.12, 0.06); // D5
    },

    playLevelClear() {
      [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
        setTimeout(() => this.playTone(freq, 'triangle', 0.22, 0.09), i * 85);
      });
    },

    playVictoryFanfare() {
      [440, 554.37, 659.25, 880, 1108.73, 1318.51].forEach((freq, i) => {
        setTimeout(() => this.playTone(freq, 'triangle', 0.35, 0.12), i * 110);
      });
    }
  };

  // -------------------------------------------------------------
  // 2. Confetti Particle Canvas Animation
  // -------------------------------------------------------------
  const Confetti = {
    canvas: document.getElementById('confetti-canvas'),
    ctx: null,
    particles: [],
    animationId: null,

    init() {
      if (!this.canvas) return;
      this.ctx = this.canvas.getContext('2d');
      this.resize();
      window.addEventListener('resize', () => this.resize());
    },

    resize() {
      if (!this.canvas) return;
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
    },

    launch(count = 70) {
      this.init();
      if (!this.ctx) return;

      const colors = ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];
      this.particles = [];

      for (let i = 0; i < count; i++) {
        this.particles.push({
          x: window.innerWidth * 0.5 + (Math.random() - 0.5) * 300,
          y: window.innerHeight * 0.35 + (Math.random() - 0.5) * 100,
          vx: (Math.random() - 0.5) * 12,
          vy: Math.random() * -8 - 4,
          size: Math.random() * 8 + 4,
          color: colors[Math.floor(Math.random() * colors.length)],
          rotation: Math.random() * 360,
          vRot: (Math.random() - 0.5) * 10,
          opacity: 1
        });
      }

      if (this.animationId) cancelAnimationFrame(this.animationId);
      this.render();
    },

    render() {
      if (!this.ctx) return;
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      let alive = false;
      this.particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.28; // gravity
        p.vx *= 0.98; // air drag
        p.rotation += p.vRot;
        p.opacity -= 0.0075;

        if (p.opacity > 0) {
          alive = true;
          this.ctx.save();
          this.ctx.translate(p.x, p.y);
          this.ctx.rotate((p.rotation * Math.PI) / 180);
          this.ctx.fillStyle = p.color;
          this.ctx.globalAlpha = Math.max(0, p.opacity);
          this.ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 1.4);
          this.ctx.restore();
        }
      });

      if (alive) {
        this.animationId = requestAnimationFrame(() => this.render());
      } else {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      }
    }
  };

  // -------------------------------------------------------------
  // 3. Application State & Controller
  // -------------------------------------------------------------
  const state = {
    experimentPlan: null,
    currentBlockIndex: 0,
    currentWordIndex: 0,
    currentTestIndex: 0,
    currentBlockTrials: [],
    recordedBlocks: [],
    trialStartTime: 0,
    activeMode: 'setup',
    analysisResults: null,
    currentStreak: 0
  };

  // DOM Elements
  const screens = {
    setup: document.getElementById('screen-setup'),
    study: document.getElementById('screen-study'),
    retention: document.getElementById('screen-retention'),
    test: document.getElementById('screen-test'),
    blockBreak: document.getElementById('screen-block-break'),
    results: document.getElementById('screen-results')
  };

  // Sound Button
  const btnSoundToggle = document.getElementById('btn-sound-toggle');
  btnSoundToggle?.addEventListener('click', () => {
    const isEnabled = AudioEngine.toggle();
    btnSoundToggle.textContent = isEnabled ? '🔊 Sound: ON' : '🔇 Sound: OFF';
    if (isEnabled) AudioEngine.playClick();
  });

  // Fullscreen Helpers & Controls
  function enterFullscreen() {
    const docEl = document.documentElement;
    try {
      if (docEl.requestFullscreen) {
        docEl.requestFullscreen().catch(() => {});
      } else if (docEl.webkitRequestFullscreen) {
        docEl.webkitRequestFullscreen();
      } else if (docEl.msRequestFullscreen) {
        docEl.msRequestFullscreen();
      }
    } catch (e) {}
  }

  function exitFullscreen() {
    try {
      if (document.fullscreenElement || document.webkitFullscreenElement) {
        if (document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        } else if (document.webkitExitFullscreen) {
          document.webkitExitFullscreen();
        }
      }
    } catch (e) {}
  }

  function toggleFullscreen() {
    if (document.fullscreenElement || document.webkitFullscreenElement) {
      exitFullscreen();
    } else {
      enterFullscreen();
    }
  }

  const btnFullscreenToggle = document.getElementById('btn-fullscreen-toggle');
  btnFullscreenToggle?.addEventListener('click', () => {
    AudioEngine.playClick();
    toggleFullscreen();
  });

  document.addEventListener('fullscreenchange', () => {
    if (btnFullscreenToggle) {
      const isFull = !!(document.fullscreenElement || document.webkitFullscreenElement);
      btnFullscreenToggle.textContent = isFull ? '⛶ Exit Full' : '⛶ Fullscreen';
    }
  });

  // Setup Inputs
  const inputSubject = document.getElementById('input-subject');
  const selectPresMode = document.getElementById('select-pres-mode');
  const selectWordDuration = document.getElementById('select-word-duration');
  const selectRespMode = document.getElementById('select-resp-mode');
  const btnStartExp = document.getElementById('btn-start-exp');
  const btnSimulate = document.getElementById('btn-simulate');
  const btnSetupImport = document.getElementById('btn-setup-import');
  const btnHeaderImport = document.getElementById('btn-header-import');
  const btnImportData = document.getElementById('btn-import-data');
  const fileImportData = document.getElementById('file-import-data');
  const toastNotice = document.getElementById('toast-notice');

  // Study Screen
  const studyBlockBadge = document.getElementById('study-block-badge');
  const studyProgressText = document.getElementById('study-progress-text');
  const studyWordDisplay = document.getElementById('study-word-display');
  const studyTimerBar = document.getElementById('study-timer-bar');
  const studyCloudContainer = document.getElementById('study-cloud-container');
  const btnCloudReady = document.getElementById('btn-cloud-ready');

  // Test Screen
  const testBlockBadge = document.getElementById('test-block-badge');
  const testProgressText = document.getElementById('test-progress-text');
  const testProbeWord = document.getElementById('test-probe-word');
  const streakBanner = document.getElementById('streak-banner');
  const ratingScaleGrid = document.getElementById('rating-scale-grid');
  const binaryBtnsGrid = document.getElementById('binary-btns-grid');

  // Break Screen
  const breakTitle = document.getElementById('break-title');
  const breakDesc = document.getElementById('break-desc');
  const btnNextBlock = document.getElementById('btn-next-block');

  // Results Screen
  const resBadgeTag = document.getElementById('res-badge-tag');
  const resHeroPlayerName = document.getElementById('res-hero-player-name');
  const resHeroDesc = document.getElementById('res-hero-desc');
  const resDecisionStylePill = document.getElementById('res-decision-style-pill');
  const resBrainScore = document.getElementById('res-brain-score');
  const resAccuracy = document.getElementById('res-accuracy');
  const resMeanD = document.getElementById('res-mean-d');
  const resMeanB = document.getElementById('res-mean-b');
  const resMeanRt = document.getElementById('res-mean-rt');
  const sdtTableBody = document.getElementById('sdt-table-body');

  const btnExportJson = document.getElementById('btn-export-json');
  const btnDownloadCsv = document.getElementById('btn-download-csv');
  const btnCopySdt = document.getElementById('btn-copy-sdt');
  const btnRestart = document.getElementById('btn-restart');

  function showToast(message) {
    if (!toastNotice) return;
    toastNotice.textContent = message;
    toastNotice.style.display = 'block';
    setTimeout(() => {
      toastNotice.style.display = 'none';
    }, 2800);
  }

  function switchScreen(screenName) {
    state.activeMode = screenName;
    Object.keys(screens).forEach(key => {
      if (screens[key]) {
        screens[key].style.display = (key === screenName ? 'block' : 'none');
      }
    });
  }

  function getSelectedSetSizes() {
    const checkboxes = document.querySelectorAll('input[name="set-size"]:checked');
    const sizes = Array.from(checkboxes).map(cb => parseInt(cb.value)).filter(v => !isNaN(v));
    return sizes.length > 0 ? sizes : [4, 8, 12, 16];
  }

  // -------------------------------------------------------------
  // 4. Import Complete Data Functionality
  // -------------------------------------------------------------
  function triggerImport() {
    AudioEngine.playClick();
    if (fileImportData) {
      fileImportData.value = '';
      fileImportData.click();
    }
  }

  btnSetupImport?.addEventListener('click', triggerImport);
  btnHeaderImport?.addEventListener('click', triggerImport);
  btnImportData?.addEventListener('click', triggerImport);

  fileImportData?.addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const rawJson = JSON.parse(evt.target.result);
        if (!rawJson.blocks || !Array.isArray(rawJson.blocks)) {
          alert('Invalid file format: JSON must contain a "blocks" array.');
          return;
        }

        // Check if data already contains analyzed summaries
        const isAnalyzed = rawJson.blocks.length > 0 && rawJson.blocks[0].summary && rawJson.blocks[0].roc;
        if (isAnalyzed) {
          displayResults(rawJson);
          showToast('Complete data imported successfully!');
          AudioEngine.playVictoryFanfare();
          Confetti.launch(50);
        } else {
          // Send to analyze endpoint
          const res = await fetch('/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(rawJson)
          });
          if (!res.ok) throw new Error('Analysis failed');
          const analyzed = await res.json();
          displayResults(analyzed);
          showToast('Complete data imported & analyzed!');
          AudioEngine.playVictoryFanfare();
          Confetti.launch(50);
        }
      } catch (err) {
        alert('Failed to parse experiment data: ' + err.message);
      }
    };
    reader.readAsText(file);
  });

  // -------------------------------------------------------------
  // 5. Start Real Experiment
  // -------------------------------------------------------------
  btnStartExp?.addEventListener('click', async () => {
    AudioEngine.playClick();
    enterFullscreen(); // Automatically enters fullscreen mode when experiment starts
    const subjectName = inputSubject.value.trim() || 'Player 1';
    const setSizes = getSelectedSetSizes();
    const presMode = selectPresMode.value;
    const wordDur = parseInt(selectWordDuration.value);
    const respMode = selectRespMode.value;

    btnStartExp.disabled = true;
    btnStartExp.textContent = 'Preparing Challenge...';

    try {
      const response = await fetch('/api/create-experiment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject_name: subjectName,
          set_sizes: setSizes,
          presentation_mode: presMode,
          word_duration_ms: wordDur,
          response_mode: respMode
        })
      });

      if (!response.ok) throw new Error('Failed to generate experiment plan');
      state.experimentPlan = await response.json();
      state.currentBlockIndex = 0;
      state.recordedBlocks = [];
      state.currentStreak = 0;

      startStudyPhase();
    } catch (err) {
      alert('Error initializing experiment: ' + err.message);
    } finally {
      btnStartExp.disabled = false;
      btnStartExp.textContent = '🎮 Start Challenge';
    }
  });

  // -------------------------------------------------------------
  // 6. Simulation / Demo Mode
  // -------------------------------------------------------------
  btnSimulate?.addEventListener('click', async () => {
    AudioEngine.playClick();
    btnSimulate.disabled = true;
    btnSimulate.textContent = 'Generating Run...';

    try {
      const setSizes = getSelectedSetSizes();
      const response = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ set_sizes: setSizes })
      });

      if (!response.ok) throw new Error('Simulation failed');
      const simData = await response.json();
      displayResults(simData);
      AudioEngine.playVictoryFanfare();
      Confetti.launch(60);
      showToast('⚡ Simulated subject data loaded!');
    } catch (err) {
      alert('Simulation error: ' + err.message);
    } finally {
      btnSimulate.disabled = false;
      btnSimulate.textContent = '⚡ Instant Demo (Simulated Run)';
    }
  });

  // -------------------------------------------------------------
  // 7. Study / Memorization Phase
  // -------------------------------------------------------------
  function startStudyPhase() {
    switchScreen('study');
    const block = state.experimentPlan.blocks[state.currentBlockIndex];
    studyBlockBadge.textContent = `Level ${state.currentBlockIndex + 1} of ${state.experimentPlan.total_blocks} (Set Size ${block.set_size})`;

    if (state.experimentPlan.presentation_mode === 'cloud') {
      studyWordDisplay.style.display = 'none';
      studyTimerBar.parentElement.style.display = 'none';
      studyCloudContainer.style.display = 'flex';
      btnCloudReady.style.display = 'inline-flex';
      studyProgressText.textContent = `Memorize all ${block.study_words.length} words`;

      studyCloudContainer.innerHTML = block.study_words
        .map(w => `<span class="cloud-word">${w}</span>`)
        .join('');
    } else {
      studyWordDisplay.style.display = 'block';
      studyTimerBar.parentElement.style.display = 'block';
      studyCloudContainer.style.display = 'none';
      btnCloudReady.style.display = 'none';

      state.currentWordIndex = 0;
      showNextStudyWord();
    }
  }

  function showNextStudyWord() {
    const block = state.experimentPlan.blocks[state.currentBlockIndex];
    if (state.currentWordIndex >= block.study_words.length) {
      startRetentionPhase();
      return;
    }

    const word = block.study_words[state.currentWordIndex];
    studyWordDisplay.textContent = word;
    studyProgressText.textContent = `Word ${state.currentWordIndex + 1} of ${block.study_words.length}`;
    AudioEngine.playWordFlash();

    studyTimerBar.style.transition = 'none';
    studyTimerBar.style.width = '100%';
    setTimeout(() => {
      studyTimerBar.style.transition = `width ${state.experimentPlan.word_duration_ms}ms linear`;
      studyTimerBar.style.width = '0%';
    }, 20);

    setTimeout(() => {
      state.currentWordIndex++;
      showNextStudyWord();
    }, state.experimentPlan.word_duration_ms);
  }

  btnCloudReady?.addEventListener('click', () => {
    AudioEngine.playClick();
    startRetentionPhase();
  });

  // -------------------------------------------------------------
  // 8. Retention Phase
  // -------------------------------------------------------------
  function startRetentionPhase() {
    switchScreen('retention');
    setTimeout(() => {
      startTestPhase();
    }, 1800);
  }

  // -------------------------------------------------------------
  // 9. Test / Recognition Phase
  // -------------------------------------------------------------
  function startTestPhase() {
    switchScreen('test');
    const block = state.experimentPlan.blocks[state.currentBlockIndex];
    state.currentTestIndex = 0;
    state.currentBlockTrials = [];

    testBlockBadge.textContent = `Level ${state.currentBlockIndex + 1} of ${state.experimentPlan.total_blocks} (Recognition)`;

    if (state.experimentPlan.response_mode === 'binary') {
      ratingScaleGrid.style.display = 'none';
      binaryBtnsGrid.style.display = 'grid';
    } else {
      ratingScaleGrid.style.display = 'grid';
      binaryBtnsGrid.style.display = 'none';
    }

    showNextTestProbe();
  }

  function showNextTestProbe() {
    const block = state.experimentPlan.blocks[state.currentBlockIndex];
    if (state.currentTestIndex >= block.test_items.length) {
      finishCurrentBlock();
      return;
    }

    const testItem = block.test_items[state.currentTestIndex];
    testProbeWord.textContent = testItem.word;
    testProgressText.textContent = `Probe ${state.currentTestIndex + 1} of ${block.test_items.length}`;

    // Update streak banner
    if (state.currentStreak >= 3 && streakBanner) {
      streakBanner.textContent = `🔥 ${state.currentStreak} In A Row!`;
      streakBanner.style.display = 'inline-block';
    } else if (streakBanner) {
      streakBanner.style.display = 'none';
    }

    state.trialStartTime = performance.now();
  }

  function recordResponse(rating, isYes) {
    if (state.activeMode !== 'test') return;

    AudioEngine.playResponse();
    const rt = Math.round(performance.now() - state.trialStartTime);
    const block = state.experimentPlan.blocks[state.currentBlockIndex];
    const testItem = block.test_items[state.currentTestIndex];

    const isCorrect = (testItem.is_target && isYes) || (!testItem.is_target && !isYes);
    if (isCorrect) {
      state.currentStreak++;
    } else {
      state.currentStreak = 0;
    }

    state.currentBlockTrials.push({
      word: testItem.word,
      is_target: testItem.is_target,
      rating: rating,
      response_yes: isYes,
      reaction_time_ms: rt
    });

    state.currentTestIndex++;
    showNextTestProbe();
  }

  // Click listeners for Rating Buttons
  document.querySelectorAll('.rating-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const rating = parseInt(btn.dataset.rating);
      recordResponse(rating, rating >= 4);
    });
  });

  // Binary Buttons
  document.getElementById('btn-resp-no')?.addEventListener('click', () => {
    recordResponse(2, false);
  });
  document.getElementById('btn-resp-yes')?.addEventListener('click', () => {
    recordResponse(5, true);
  });

  // Global Keyboard shortcuts
  window.addEventListener('keydown', (e) => {
    if (state.activeMode !== 'test') return;
    const key = e.key.toUpperCase();
    if (['1', '2', '3', '4', '5', '6'].includes(key)) {
      const rating = parseInt(key);
      recordResponse(rating, rating >= 4);
    } else if (key === 'Y') {
      recordResponse(5, true);
    } else if (key === 'N') {
      recordResponse(2, false);
    }
  });

  // -------------------------------------------------------------
  // 10. Finish Block / Break Screen
  // -------------------------------------------------------------
  function finishCurrentBlock() {
    const block = state.experimentPlan.blocks[state.currentBlockIndex];
    state.recordedBlocks.push({
      set_size: block.set_size,
      study_words: block.study_words,
      trials: state.currentBlockTrials
    });

    state.currentBlockIndex++;

    if (state.currentBlockIndex < state.experimentPlan.total_blocks) {
      switchScreen('blockBreak');
      AudioEngine.playLevelClear();
      Confetti.launch(35);

      const nextBlock = state.experimentPlan.blocks[state.currentBlockIndex];
      breakTitle.textContent = `Level ${state.currentBlockIndex} Cleared!`;
      breakDesc.textContent = `Great memory work! Ready to challenge Level ${state.currentBlockIndex + 1} with ${nextBlock.set_size} words?`;
    } else {
      submitResultsForAnalysis();
    }
  }

  btnNextBlock?.addEventListener('click', () => {
    AudioEngine.playClick();
    startStudyPhase();
  });

  // -------------------------------------------------------------
  // 11. Submit to Backend
  // -------------------------------------------------------------
  async function submitResultsForAnalysis() {
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject_name: state.experimentPlan.subject_name,
          date: state.experimentPlan.date,
          blocks: state.recordedBlocks
        })
      });

      if (!response.ok) throw new Error('Analysis failed');
      const results = await response.json();
      displayResults(results);
      AudioEngine.playVictoryFanfare();
      Confetti.launch(80);
    } catch (err) {
      alert('Error analyzing results: ' + err.message);
    }
  }

  // -------------------------------------------------------------
  // 12. Display Results & Gamified Profile
  // -------------------------------------------------------------
  function displayResults(data) {
    exitFullscreen(); // Automatically exit fullscreen to comfortably view and export results
    state.analysisResults = data;
    switchScreen('results');

    const blocks = data.blocks || [];
    if (blocks.length === 0) return;

    const playerName = data.subject_name || 'Player';
    resHeroPlayerName.textContent = `${playerName}'s Cognitive Profile`;

    // Overall summary metrics
    const avgAccuracy = Math.round(blocks.reduce((acc, b) => acc + b.summary.accuracy, 0) / blocks.length);
    const avgD = parseFloat((blocks.reduce((acc, b) => acc + b.summary.d_prime, 0) / blocks.length).toFixed(2));
    const avgB = parseFloat((blocks.reduce((acc, b) => acc + b.summary.b, 0) / blocks.length).toFixed(2));
    const avgRt = Math.round(blocks.reduce((acc, b) => acc + b.mean_reaction_time_ms, 0) / blocks.length);

    resAccuracy.textContent = `${avgAccuracy}%`;
    resMeanD.textContent = avgD.toFixed(2);
    resMeanB.textContent = avgB.toFixed(2);
    resMeanRt.textContent = `${avgRt} ms`;

    // Calculate Gamified Brain Power Score (out of 1000)
    // Points from d' (up to 550), accuracy (up to 300), speed (up to 150)
    const dScore = Math.min(550, Math.round((avgD / 3.0) * 550));
    const accScore = Math.min(300, Math.round((avgAccuracy / 100.0) * 300));
    const speedScore = Math.max(30, Math.min(150, Math.round((1400 - Math.min(1300, avgRt)) * 0.16)));
    const totalScore = Math.max(100, Math.min(999, dScore + accScore + speedScore));
    resBrainScore.textContent = totalScore;

    // Brain Archetype
    let archetypeBadge = '🏆 Photographic Memory Master';
    let archetypeDesc = 'Exceptional feature discriminability and memory capacity under high cognitive load!';
    if (avgD >= 2.1) {
      archetypeBadge = '🏆 Photographic Memory Master';
      archetypeDesc = 'Incredible working memory! Targets stand out with razor-sharp clarity against distractor lures.';
    } else if (avgD >= 1.5) {
      archetypeBadge = '🧠 Sherlock Detective Mind';
      archetypeDesc = 'High sensitivity and keen feature detection. Easily parses studied items with swift precision.';
    } else if (avgD >= 0.9) {
      archetypeBadge = '⚡ Nimble Recall Specialist';
      archetypeDesc = 'Solid memory span with quick decision instincts. Handles moderate cognitive load gracefully.';
    } else {
      archetypeBadge = '🦉 Cautious Strategist';
      archetypeDesc = 'Calculated and measured approach when navigating difficult and ambiguous memory probes.';
    }
    resBadgeTag.textContent = archetypeBadge;
    resHeroDesc.textContent = archetypeDesc;

    // Decision Style
    let styleText = '⚖️ Decision Style: Perfectly Balanced';
    if (avgB > 0.25) {
      styleText = '🛡️ Decision Style: Conservative (Careful & avoids false alarms)';
    } else if (avgB < -0.25) {
      styleText = '⚡ Decision Style: Intuitive (Rapid & maximizes hits)';
    }
    resDecisionStylePill.textContent = styleText;

    // Populate Level Performance Summary Table
    sdtTableBody.innerHTML = blocks.map((b, idx) => {
      const s = b.summary;
      return `
        <tr>
          <td><strong>Level ${idx + 1} (${b.set_size} Words)</strong></td>
          <td>${s.n_targets}</td>
          <td>${s.n_lures}</td>
          <td>${s.hits}</td>
          <td>${s.misses}</td>
          <td>${s.false_alarms}</td>
          <td>${s.correct_rejections}</td>
          <td>${(s.raw_hit_rate * 100).toFixed(1)}%</td>
          <td>${(s.raw_false_alarm_rate * 100).toFixed(1)}%</td>
          <td class="table-highlight">${s.d_prime}</td>
          <td>${s.c}</td>
          <td>${s.b}</td>
          <td>${s.beta}</td>
          <td>${b.mean_reaction_time_ms} ms</td>
        </tr>
      `;
    }).join('');

    // Render 3 Interactive SVG Charts
    setTimeout(() => {
      window.SDTCharts.renderDPrimeChart('chart-dprime-container', blocks);
      window.SDTCharts.renderBiasChart('chart-bias-container', blocks);
      window.SDTCharts.renderROCChart('chart-roc-container', blocks);
    }, 50);
  }

  // -------------------------------------------------------------
  // 13. Export JSON & CSV & Copy Data
  // -------------------------------------------------------------
  // Export JSON
  btnExportJson?.addEventListener('click', () => {
    if (!state.analysisResults) return;
    AudioEngine.playClick();
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(state.analysisResults, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `mindgrid_memory_data_${state.analysisResults.subject_name || 'session'}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('💾 Complete experiment JSON downloaded!');
  });

  // Export CSV
  btnDownloadCsv?.addEventListener('click', async () => {
    if (!state.analysisResults) return;
    AudioEngine.playClick();
    try {
      const response = await fetch('/api/export-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state.analysisResults)
      });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mindgrid_trials_${state.analysisResults.subject_name || 'session'}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      showToast('📊 Trial CSV downloaded!');
    } catch (err) {
      alert('CSV export failed: ' + err.message);
    }
  });

  // Copy SDT Metrics to Clipboard (for student's assignment report!)
  btnCopySdt?.addEventListener('click', () => {
    if (!state.analysisResults || !state.analysisResults.blocks) return;
    AudioEngine.playClick();

    let text = `Participant: ${state.analysisResults.subject_name}\n`;
    text += `Date: ${state.analysisResults.date}\n\n`;
    text += `Set_Size\tHits\tMisses\tFAs\tCRs\tHit_Rate\tFA_Rate\td_prime\tc\tb\tbeta\tMean_RT_ms\n`;

    state.analysisResults.blocks.forEach(b => {
      const s = b.summary;
      text += `${b.set_size}\t${s.hits}\t${s.misses}\t${s.false_alarms}\t${s.correct_rejections}\t${s.raw_hit_rate}\t${s.raw_false_alarm_rate}\t${s.d_prime}\t${s.c}\t${s.b}\t${s.beta}\t${b.mean_reaction_time_ms}\n`;
    });

    navigator.clipboard.writeText(text).then(() => {
      showToast('📋 Raw SDT metrics copied to clipboard!');
    }).catch(() => {
      showToast('Unable to copy automatically.');
    });
  });

  // Play Again
  btnRestart?.addEventListener('click', () => {
    AudioEngine.playClick();
    switchScreen('setup');
  });

  // Resize handler for responsive SVG charts
  window.addEventListener('resize', () => {
    if (state.activeMode === 'results' && state.analysisResults) {
      window.SDTCharts.renderDPrimeChart('chart-dprime-container', state.analysisResults.blocks);
      window.SDTCharts.renderBiasChart('chart-bias-container', state.analysisResults.blocks);
      window.SDTCharts.renderROCChart('chart-roc-container', state.analysisResults.blocks);
    }
  });
});
