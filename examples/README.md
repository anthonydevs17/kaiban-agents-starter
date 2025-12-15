# Kaiban Agents Examples

This directory contains independent example projects that demonstrate how to use the **Kaiban Agents Starter** with custom agents using different LLM SDKs or combinations of them.

Each example is a complete and functional project that you can download and run directly. These examples showcase different approaches to integrating agents with the Kaiban platform using various frameworks and LLM providers.

## 📦 Available Examples

### 1. [Airline Revenue Management](./airline-revenue-management-kaibanjs/)

**SDK:** KaibanJS Workflows

An airline revenue management agent example that uses **KaibanJS workflows** to process Excel data analysis. Demonstrates how to create complex multi-step workflows to extract, process, and analyze information.

**Features:**

- Excel file processing
- Multi-step workflows with KaibanJS
- Route and pricing data analysis
- Data extraction and cleaning

---

### 2. [Airport Services Agent](./airport-services-agent-aws-bedrock/)

**SDK:** AWS Bedrock

An airport services agent that uses **AWS Bedrock** as the LLM provider. This example shows how to integrate agents with AWS services to provide assistance and recommendations about services available at airports.

**Features:**

- AWS Bedrock Runtime integration
- Airport services advisory agent
- Complex query handling

---

### 3. [Sourcing Freelance Pilot](./sourcing-freelance-pilot-kaibanjs/)

**SDK:** KaibanJS Teams

An agent example for sourcing and hiring freelance pilots using **KaibanJS teams**. Demonstrates how to work with collaborative agent teams to perform sourcing and evaluation tasks.

**Features:**

- Pilot data processing from Excel
- KaibanJS teams for agent collaboration
- Candidate evaluation and filtering

---

### 4. [Visit Planner Agent](./visit-planner-agent-mastra/)

**SDK:** Mastra Framework + OpenAI

A visit planner agent that uses the **Mastra** framework along with **OpenAI** as the LLM provider. This example shows how to integrate modern agent frameworks with the Kaiban starter.

**Features:**

- Mastra framework for agent management
- OpenAI integration via @ai-sdk/openai
- Intelligent visit planning

---

## 🚀 How to Use the Examples

Each example is an independent project. To use any of them:

1. **Navigate to the example directory:**

   ```bash
   cd examples/[example-name]
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Configure environment variables:**
   - Copy the `.env.example` file to `.env` (if it exists)
   - Configure the necessary credentials according to the SDK used

4. **Run the project:**
   ```bash
   npm run dev    # Development mode
   npm start      # Production mode
   npm test       # Run tests
   ```

## 🔧 SDKs and Frameworks Used

The examples cover different integration options:

- **KaibanJS**: Native Kaiban framework for workflows and teams
- **AWS Bedrock**: Amazon Web Services LLM services
- **Mastra**: Modern framework for building agents
- **OpenAI**: Integration with OpenAI models

You can use any of these approaches or combine them according to your needs. Each example includes commented code and documentation to help you understand the implementation.

## 📚 Additional Documentation

For more information on how to use the Kaiban Agents Starter, check out the [official documentation](https://docs.kaiban.io/get-started/quick-start).
