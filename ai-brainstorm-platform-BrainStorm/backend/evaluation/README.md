# Evaluation Setup

This directory contains scripts to evaluate the AI Brainstorm Platform's agent responses using **TypeScript** and **LLM-as-a-Judge**.

## Prerequisites

1. **Node.js** (v18+)
2. **Anthropic API Key** (in `backend/.env`)

## Setup

1. **Install Dependencies:**
   Ensure you have the backend dependencies installed:

   ```bash
   cd ../ # Go to backend root
   npm install
   ```

2. **Configure Environment:**
   Ensure your `backend/.env` file has your `ANTHROPIC_API_KEY`.

## Usage

### 1. Collect Responses

Run the agent against the test queries to generate the dataset.

```bash
# From backend/ directory
npx ts-node evaluation/collect_responses.ts
```

This generates `evaluation/test_dataset.json`.

### 2. Run Evaluation

Run the TypeScript script to evaluate the collected responses using Claude as a judge.

```bash
# From backend/ directory
npx ts-node evaluation/evaluate.ts
```

This generates `evaluation/evaluation_results.json` with scores and reasoning.

## Metrics

- **Relevance (1-5)**: Measures how pertinent the AI's response is to the user's query.
- **Coherence (1-5)**: Evaluates how logical and well-structured the response is.

## Files

- `test_queries.json`: Input queries for testing.
- `collect_responses.ts`: Script to run queries against the backend.
- `evaluate.ts`: TypeScript script using Claude to evaluate responses.
