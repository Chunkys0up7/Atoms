import requests
import json
import time

BASE_URL = "http://127.0.0.1:8000/api"

def run_verification():
    # Clear log file
    with open("verify_log.txt", "w", encoding="utf-8") as f:
        f.write("")

    def log_print(msg):
        print(msg)
        with open("verify_log.txt", "a", encoding="utf-8") as f:
            f.write(msg + "\n")
            
    log_print("--- Starting BPM Verification ---")

    # 1. Start Process
    log_print("\n1. Starting 'document_approval' process...")
    payload = {
        "process_definition_id": "document_approval",
        "process_name": "Verification Doc Approval",
        "process_type": "custom",
        "initiated_by": "verifier",
        "priority": "high",
        "input_data": {"doc_id": "123"}
    }
    
    try:
        resp = requests.post(f"{BASE_URL}/processes", json=payload)
        resp.raise_for_status()
        process = resp.json()
        process_id = process["id"]
        log_print(f"   Success! Process ID: {process_id}")
    except Exception as e:
        log_print(f"   Failed to start process: {e}")
        if 'resp' in locals(): log_print(resp.text)
        return

    # 2. Check for Initial Task (draft_review)
    log_print("\n2. Checking for initial task (draft_review)...")
    time.sleep(1) # Give DB a moment (though it should be sync)
    
    tasks_resp = requests.get(f"{BASE_URL}/tasks", params={"process_id": process_id})
    tasks_data = tasks_resp.json()
    tasks = tasks_data.get("tasks", []) if isinstance(tasks_data, dict) else tasks_data
    
    if len(tasks) == 0:
        log_print("   FAILED: No tasks created.")
        return
        
    initial_task = tasks[0]
    log_print(f"   Found task: {initial_task['task_name']} (ID: {initial_task['id']})")
    
    if initial_task['task_definition_id'] != 'draft_review':
        log_print(f"   FAILED: Expected 'draft_review', got {initial_task['task_definition_id']}")
        return
    else:
        log_print("   Success! Initial task matches workflow definition.")

    # 3. Complete Task with Approval
    log_print("\n3. Completing initial task with outcome='approved'...")
    
    complete_payload = {
        "output_data": {"outcome": "approved"},
        "user_id": "verifier"
    }
    
    comp_resp = requests.post(f"{BASE_URL}/tasks/{initial_task['id']}/complete", json=complete_payload)
    if comp_resp.status_code != 200:
        log_print(f"   Failed to complete task: {comp_resp.text}")
        return
        
    log_print("   Task completed successfully.")

    # 4. Verify Next Task Creation (legal_check)
    log_print("\n4. Verifying transition to 'legal_check'...")
    time.sleep(1)
    
    tasks_resp_2 = requests.get(f"{BASE_URL}/tasks", params={"process_id": process_id})
    tasks_data_2 = tasks_resp_2.json()
    all_tasks = tasks_data_2.get("tasks", []) if isinstance(tasks_data_2, dict) else tasks_data_2
    
    if len(all_tasks) < 2:
        log_print(f"   FAILED: Expected 2 tasks, found {len(all_tasks)}")
        return
        
    # Find the new task (one that isn't the initial one)
    new_task = next((t for t in all_tasks if t['id'] != initial_task['id']), None)
    
    if new_task and new_task['task_definition_id'] == 'legal_check':
        log_print(f"   Success! Transitioned to: {new_task['task_name']} ({new_task['task_definition_id']})")
    elif new_task:
        log_print(f"   FAILED: Expected 'legal_check', got {new_task['task_definition_id']}")
    else:
        log_print("   FAILED: Could not find new task.")

    log_print("\n--- Verification Complete ---")

if __name__ == "__main__":
    run_verification()
