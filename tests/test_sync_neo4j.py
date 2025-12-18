import os
import tempfile
import json
import unittest
import importlib.util


def load_module_from_path(path, name):
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


class TestSyncNeo4j(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.mod = load_module_from_path(os.path.join('scripts', 'sync_neo4j.py'), 'sync_neo4j')

    def test_sanitize_relation_type(self):
        f = self.mod.sanitize_relation_type
        self.assertEqual(f('TRIGGERS'), 'TRIGGERS')
        self.assertEqual(f('Requires!'), 'Requires_')
        self.assertEqual(f(''), 'RELATED')
        long = 'A'*100
        self.assertEqual(len(f(long)), 64)

    def test_validate_graph(self):
        data = {'nodes': [{'id': 'A'}], 'edges': [{'source': 'A', 'target': 'B'}]}
        with tempfile.NamedTemporaryFile('w', delete=False, suffix='.json') as fh:
            json.dump(data, fh)
            path = fh.name
        try:
            n_nodes, n_edges = self.mod.validate_graph(path)
            self.assertEqual(n_nodes, 1)
            self.assertEqual(n_edges, 1)
        finally:
            os.remove(path)


if __name__ == '__main__':
    unittest.main()
