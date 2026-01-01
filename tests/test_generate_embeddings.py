import importlib.util
import os
import tempfile
import unittest
from pathlib import Path


def load_module_from_path(path, name):
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


class TestGenerateEmbeddings(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.mod = load_module_from_path(os.path.join("scripts", "generate_embeddings.py"), "generate_embeddings")

    def test_gather_atoms_empty(self):
        tmp = tempfile.TemporaryDirectory()
        try:
            items = self.mod.gather_atoms(tmp.name)
            self.assertIsInstance(items, list)
            self.assertEqual(len(items), 0)
        finally:
            tmp.cleanup()

    def test_gather_atoms_with_file(self):
        tmp = tempfile.TemporaryDirectory()
        try:
            atoms_dir = Path(tmp.name)
            f = atoms_dir / "proc-example.yaml"
            f.write_text("atom_id: PROC-1\nname: test")
            items = self.mod.gather_atoms(tmp.name)
            self.assertEqual(len(items), 1)
            self.assertIn("content", items[0])
        finally:
            tmp.cleanup()


if __name__ == "__main__":
    unittest.main()
