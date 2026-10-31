import unittest
import sdt_analysis

class TestSDTAnalysis(unittest.TestCase):

    def test_phi_inv_and_cdf(self):
        # Φ^-1(0.5) should be 0.0
        self.assertAlmostEqual(sdt_analysis.phi_inv(0.5), 0.0, places=4)
        # Φ(0.0) should be 0.5
        self.assertAlmostEqual(sdt_analysis.phi_cdf(0.0), 0.5, places=4)
        # Symmetry: Φ^-1(p) == -Φ^-1(1 - p)
        self.assertAlmostEqual(sdt_analysis.phi_inv(0.8413447), 1.0, places=3)
        self.assertAlmostEqual(sdt_analysis.phi_inv(0.1586553), -1.0, places=3)

    def test_sdt_neutral_symmetric(self):
        # 8 hits out of 10 targets, 2 FAs out of 10 lures -> symmetric unbiased
        res = sdt_analysis.calculate_sdt(hits=8, misses=2, false_alarms=2, correct_rejections=8, use_correction=False)
        self.assertAlmostEqual(res["raw_hit_rate"], 0.8, places=4)
        self.assertAlmostEqual(res["raw_false_alarm_rate"], 0.2, places=4)
        # b should be exactly 0 (neutral bias)
        self.assertAlmostEqual(res["b"], 0.0, places=4)
        # d' should be ~ 1.6832
        self.assertAlmostEqual(res["d_prime"], 1.6832, places=2)
        # c should be ~ 0.8416
        self.assertAlmostEqual(res["c"], 0.8416, places=2)

    def test_extreme_rates_hautus_correction(self):
        # 10 hits out of 10 targets (H=1.0), 0 FAs out of 10 lures (F=0.0)
        # Without correction this would fail with +/- inf.
        res = sdt_analysis.calculate_sdt(hits=10, misses=0, false_alarms=0, correct_rejections=10, use_correction=True)
        # Should not raise exception and produce finite values
        self.assertTrue(res["d_prime"] > 0)
        self.assertTrue(-10 < res["b"] < 10)
        self.assertTrue(-10 < res["c"] < 10)

    def test_roc_from_confidence(self):
        targets = [6, 6, 5, 5, 4, 4, 3, 2, 5, 6]
        lures = [1, 1, 2, 2, 3, 1, 4, 2, 1, 3]
        roc = sdt_analysis.calculate_roc_from_confidence(targets, lures, max_rating=6)
        points = roc["empirical_points"]
        # Must start at (0, 0) and end at (1, 1)
        self.assertEqual(points[0]["f"], 0.0)
        self.assertEqual(points[0]["h"], 0.0)
        self.assertEqual(points[-1]["f"], 1.0)
        self.assertEqual(points[-1]["h"], 1.0)
        # Points should be monotonically increasing
        for i in range(1, len(points)):
            self.assertGreaterEqual(points[i]["f"], points[i-1]["f"])
            self.assertGreaterEqual(points[i]["h"], points[i-1]["h"])

    def test_theoretical_roc(self):
        theo = sdt_analysis.generate_theoretical_roc(d_prime=1.5, num_points=20)
        self.assertEqual(theo[0]["f"], 0.0)
        self.assertEqual(theo[0]["h"], 0.0)
        self.assertEqual(theo[-1]["f"], 1.0)
        self.assertEqual(theo[-1]["h"], 1.0)
        # All points should be above or on diagonal for d' > 0
        for pt in theo:
            self.assertGreaterEqual(pt["h"], pt["f"] - 1e-4)

    def test_simulation(self):
        words = [f"Word{i}" for i in range(60)]
        sim = sdt_analysis.generate_simulated_subject([4, 8, 12], words)
        self.assertEqual(len(sim["blocks"]), 3)
        self.assertIn("interpretations", sim)
        self.assertIn("part_a", sim["interpretations"])
        self.assertIn("part_b", sim["interpretations"])
        self.assertIn("part_c", sim["interpretations"])


class TestFlaskRoutes(unittest.TestCase):

    def setUp(self):
        import main
        main.app.config['TESTING'] = True
        self.client = main.app.test_client()

    def test_index_route(self):
        res = self.client.get('/')
        self.assertEqual(res.status_code, 200)
        self.assertIn(b'MindGrid Memory Challenge', res.data)

    def test_api_words(self):
        res = self.client.get('/api/words')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertIn('total_words', data)
        self.assertGreater(data['total_words'], 50)

    def test_create_experiment(self):
        res = self.client.post('/api/create-experiment', json={
            'subject_name': 'Tester',
            'set_sizes': [4, 8],
            'presentation_mode': 'sequential',
            'word_duration_ms': 1500,
            'response_mode': 'confidence'
        })
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(len(data['blocks']), 2)
        # Block 1 set size 4: 4 targets + 4 lures = 8 test items
        self.assertEqual(len(data['blocks'][0]['study_words']), 4)
        self.assertEqual(len(data['blocks'][0]['test_items']), 8)

    def test_simulate_and_analyze(self):
        sim_res = self.client.post('/api/simulate', json={'set_sizes': [4, 8, 12, 16]})
        self.assertEqual(sim_res.status_code, 200)
        sim_data = sim_res.get_json()
        self.assertEqual(len(sim_data['blocks']), 4)

        analyze_res = self.client.post('/api/analyze', json=sim_data)
        self.assertEqual(analyze_res.status_code, 200)
        analysis = analyze_res.get_json()
        self.assertIn('interpretations', analysis)

        csv_res = self.client.post('/api/export-csv', json=analysis)
        self.assertEqual(csv_res.status_code, 200)
        self.assertIn('text/csv', csv_res.headers['Content-Type'])


if __name__ == "__main__":
    unittest.main()
