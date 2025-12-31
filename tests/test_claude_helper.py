import importlib.util
import os
import unittest


def load_module_from_path(path, name):
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


class TestClaudeHelper(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.mod = load_module_from_path(os.path.join("scripts", "claude_helper.py"), "claude_helper")

    def test_parse_json_or_fallback(self):
        f = self.mod.parse_json_or_fallback
        self.assertEqual(f('{"a":1}'), {"a": 1})
        self.assertEqual(f("not json"), {"summary": "not json"})
        # text with JSON embedded
        self.assertEqual(f('Here: {"x":2} end'), {"x": 2})


if __name__ == "__main__":
    unittest.main()
