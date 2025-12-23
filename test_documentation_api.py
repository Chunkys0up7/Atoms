"""
Test script for documentation API endpoints
"""
import sys
import os

# Add the api directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'api'))

from routes.documentation import (
    CreateDocumentRequest,
    get_docs_dir,
    create_document,
    list_documents,
    get_document,
    delete_document
)
import json
import shutil

def test_documentation_api():
    print("Testing Documentation API...")

    # Clean up any existing test data
    docs_dir = get_docs_dir()
    if docs_dir.exists():
        print(f"Cleaning up test directory: {docs_dir}")
        shutil.rmtree(docs_dir)

    # Test 1: Create a document
    print("\n1. Testing document creation...")
    doc_request = CreateDocumentRequest(
        title="Test SOP Document",
        template_type="SOP",
        module_id="mod-underwriting",
        atom_ids=["atom-cust-001", "atom-cust-002"],
        content="# Test SOP\n\n## Purpose\n\nThis is a test document.\n\n## Procedure\n\n1. Step one\n2. Step two\n3. Step three",
        metadata={"test": True}
    )

    created_doc = create_document(doc_request)
    print(f"[OK] Created document: {created_doc['id']}")
    print(f"  Title: {created_doc['title']}")
    print(f"  Template: {created_doc['template_type']}")
    print(f"  Version: {created_doc['version']}")

    doc_id = created_doc['id']

    # Test 2: List documents
    print("\n2. Testing document listing...")
    docs_list = list_documents()
    print(f"[OK] Found {docs_list['total']} document(s)")
    assert docs_list['total'] == 1, "Should have 1 document"

    # Test 3: Get document by ID
    print("\n3. Testing get document...")
    retrieved_doc = get_document(doc_id)
    print(f"[OK] Retrieved document: {retrieved_doc['title']}")
    assert retrieved_doc['title'] == "Test SOP Document", "Title should match"
    assert retrieved_doc['content'] == doc_request.content, "Content should match"

    # Test 4: Create another document
    print("\n4. Testing multiple documents...")
    doc_request2 = CreateDocumentRequest(
        title="Technical Design Document",
        template_type="TECHNICAL_DESIGN",
        module_id="mod-servicing",
        atom_ids=["atom-bo-001"],
        content="# Technical Design\n\n## Architecture\n\nSystem overview here."
    )

    created_doc2 = create_document(doc_request2)
    print(f"[OK] Created second document: {created_doc2['id']}")

    # Test 5: List with filtering
    print("\n5. Testing filtered listing...")
    sop_docs = list_documents(template_type="SOP")
    print(f"[OK] Found {sop_docs['total']} SOP document(s)")
    assert sop_docs['total'] == 1, "Should have 1 SOP document"

    tech_docs = list_documents(template_type="TECHNICAL_DESIGN")
    print(f"[OK] Found {tech_docs['total']} Technical Design document(s)")
    assert tech_docs['total'] == 1, "Should have 1 Technical Design document"

    # Test 6: Module filtering
    print("\n6. Testing module filtering...")
    mod_docs = list_documents(module_id="mod-underwriting")
    print(f"[OK] Found {mod_docs['total']} document(s) for mod-underwriting")
    assert mod_docs['total'] == 1, "Should have 1 document for mod-underwriting"

    # Test 7: Delete document
    print("\n7. Testing document deletion...")
    delete_result = delete_document(doc_id)
    print(f"[OK] Deleted document: {delete_result['id']}")

    # Verify deletion
    remaining_docs = list_documents()
    print(f"[OK] Remaining documents: {remaining_docs['total']}")
    assert remaining_docs['total'] == 1, "Should have 1 document left"

    # Test 8: Check storage structure
    print("\n8. Checking storage structure...")
    print(f"[OK] Documents directory: {docs_dir}")
    print(f"[OK] Directory exists: {docs_dir.exists()}")

    versions_dir = docs_dir / "versions"
    print(f"[OK] Versions directory: {versions_dir}")
    print(f"[OK] Versions exist: {versions_dir.exists()}")

    if versions_dir.exists():
        version_dirs = list(versions_dir.iterdir())
        print(f"[OK] Version folders: {len(version_dirs)}")
        for vdir in version_dirs:
            version_files = list(vdir.glob("*.json"))
            print(f"  - {vdir.name}: {len(version_files)} version(s)")

    print("\n" + "="*50)
    print("[SUCCESS] All tests passed!")
    print("="*50)

    # Cleanup
    print("\nCleaning up test data...")
    if docs_dir.exists():
        shutil.rmtree(docs_dir)
    print("[OK] Cleanup complete")

if __name__ == "__main__":
    try:
        test_documentation_api()
    except Exception as e:
        print(f"\n[FAIL] Test failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
