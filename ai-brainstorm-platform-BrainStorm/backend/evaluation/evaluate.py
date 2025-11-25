import os
import json
import tempfile
from dotenv import load_dotenv
from azure.ai.evaluation import evaluate, RelevanceEvaluator, CoherenceEvaluator, GroundednessEvaluator
from azure.ai.evaluation import AzureOpenAIModelConfiguration, OpenAIModelConfiguration
from azure.identity import DefaultAzureCredential

# Load environment variables
load_dotenv()

def get_model_config():
    """
    Returns the model configuration based on environment variables.
    Prioritizes Azure OpenAI if endpoints are set.
    """
    if os.environ.get("AZURE_OPENAI_ENDPOINT"):
        print("Using Azure OpenAI Configuration")
        return AzureOpenAIModelConfiguration(
            azure_endpoint=os.environ["AZURE_OPENAI_ENDPOINT"],
            azure_deployment=os.environ.get("AZURE_OPENAI_DEPLOYMENT", "gpt-4"),
            api_key=os.environ.get("AZURE_OPENAI_API_KEY"),
            api_version=os.environ.get("AZURE_OPENAI_API_VERSION", "2024-02-15-preview"),
        )
    elif os.environ.get("OPENAI_API_KEY"):
        print("Using OpenAI Configuration")
        return OpenAIModelConfiguration(
            model=os.environ.get("OPENAI_MODEL", "gpt-4"),
            api_key=os.environ["OPENAI_API_KEY"],
        )
    else:
        raise ValueError("No OpenAI or Azure OpenAI configuration found in environment variables.")

def prepare_data(input_path, output_path):
    """
    Converts the JSON dataset to JSONL format required by Azure AI Evaluation.
    """
    print(f"Reading data from {input_path}...")
    with open(input_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    print(f"Converting {len(data)} records to JSONL...")
    with open(output_path, 'w', encoding='utf-8') as f:
        for item in data:
            # Ensure required fields exist
            record = {
                "query": item.get("query", ""),
                "response": item.get("response", ""),
                # Context is required for Groundedness, but we might not have it captured.
                # We'll use an empty string or the query as a fallback if needed, 
                # but ideally this should be the retrieved documents or conversation history.
                "context": item.get("context", "") 
            }
            f.write(json.dumps(record) + '\n')
    
    return output_path

def main():
    # Configuration
    INPUT_FILE = "test_dataset.json"
    OUTPUT_FILE = "evaluation_results.json"
    
    if not os.path.exists(INPUT_FILE):
        print(f"Error: Input file '{INPUT_FILE}' not found. Please run 'collect_responses.ts' first.")
        return

    try:
        model_config = get_model_config()
    except ValueError as e:
        print(f"Error: {e}")
        print("Please set AZURE_OPENAI_ENDPOINT/AZURE_OPENAI_API_KEY or OPENAI_API_KEY in .env")
        return

    # Initialize Evaluators
    relevance_eval = RelevanceEvaluator(model_config)
    coherence_eval = CoherenceEvaluator(model_config)
    # groundedness_eval = GroundednessEvaluator(model_config) # Requires 'context'

    evaluators = {
        "relevance": relevance_eval,
        "coherence": coherence_eval,
        # "groundedness": groundedness_eval 
    }

    # Create a temporary JSONL file for evaluation
    with tempfile.NamedTemporaryFile(mode='w+', suffix='.jsonl', delete=False) as temp_file:
        temp_jsonl_path = temp_file.name
    
    try:
        prepare_data(INPUT_FILE, temp_jsonl_path)

        print("Starting evaluation...")
        result = evaluate(
            data=temp_jsonl_path,
            evaluators=evaluators,
            evaluator_config={
                "relevance": {
                    "column_mapping": {
                        "query": "${data.query}",
                        "response": "${data.response}"
                    }
                },
                "coherence": {
                    "column_mapping": {
                        "query": "${data.query}",
                        "response": "${data.response}"
                    }
                },
                # "groundedness": {
                #     "column_mapping": {
                #         "context": "${data.context}",
                #         "response": "${data.response}"
                #     }
                # }
            },
            output_path=OUTPUT_FILE
        )

        print("\nEvaluation Complete!")
        print("-" * 30)
        print("Aggregate Metrics:")
        print(json.dumps(result["metrics"], indent=2))
        print("-" * 30)
        print(f"Detailed results saved to {OUTPUT_FILE}")
        print(f"Studio URL: {result.get('studio_url', 'N/A')}")

    finally:
        # Cleanup
        if os.path.exists(temp_jsonl_path):
            os.remove(temp_jsonl_path)

if __name__ == "__main__":
    main()
