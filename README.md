# JHipster LLM

A Blueprint for adapting [JHipster](https://www.jhipster.tech/) / Spring Boot applications to LLM (Large Language Model)

# Introduction

This is a tool for quickly and easily generating Spring Boot application code using the LLM. For code generation, it utilizes [JHipster](https://www.jhipster.tech/), which can output various variations of Spring Boot application code. The code generation for LLM is achieved by using the [Blueprint](https://www.jhipster.tech/modules/extending-and-customizing/) feature, which extends JHipster's code generation capabilities.

This tool outputs the following code:

- Code for a Spring Boot application server, including the development environment such as build tools (a feature of JHipster)
- Code for an OpenAI API compatible server
    - Code for the [OpenAI Chat Completions API](https://platform.openai.com/docs/api-reference/chat) using [OpenAPI spec](https://github.com/openai/openai-openapi) and [OpenAPI Generator](https://github.com/OpenAPITools/openapi-generator)
        - Depending on whether the user selects Flux or Spring MVC, it outputs code for chat responses using Server-Sent Events for streaming
- Code using the LLM library supported by [Spring AI](https://docs.spring.io/spring-ai/reference/). Currently, it supports the following:
    - [Ollama](https://ollama.com/)
    - [Java Bindings for Llama.cpp](https://github.com/kherud/java-llama.cpp)
- Download of the selected LLM model
- Introduction of a Chat UI client
    - Installs [BetterChatGPT](https://github.com/ztjhz/BetterChatGPT)

In the near future, we plan to support:
- Other LLM libraries of Spring AI
- RAG support using VectorDB
- [Langchain for Java](https://github.com/langchain4j/langchain4j) support
- Other Chat UI support
- gradle

# Prerequisites
- Java 17 or later
- Node.js 20 or later
- Docker is required for running Ollama

# Installation

The following command will install the code generator:

```bash
npm install -g generator-jhipster-llm
```

# Usage

If you want to create the simplest application, execute the following command. After executing the command, you will be prompted with a series of questions to configure the code generation for the LLM-enabled Spring Boot application.

```bash
mkdir myLlmApp
cd myLlmApp
jhipster-llm generate-sample sample.jdl
```
(Note: Currently, only the minimal JHipster application configuration written in `.blueprint/generate-sample/templates/samples/sample.jdl` is supported. We plan to support various other configurations in the future.)

Answer the following questions. By default, local llama.cpp and mistral 7B are selected.
- `Which LLM library do you want to use?`
- `Would you like to use a LLM model?`

Execute the following to start Spring Boot. The necessary LLM model will be downloaded at startup.
```bash
./mvnw
```
After starting, access the following URL. The chat application will be displayed.
[http://localhost:8080/chat-ui/index.html](http://localhost:8080/chat-ui/index.html)

When you open the BetterChatGPT screen, open the API menu,check `Use custom API endpoint`, and enter `http://localhost:8080/api/llm/v1/chat/completions` in the API Endpoint.

Try typing something. Congratulations if you get a response! Enjoy building applications with LLM and Java!

# Note when choosing Ollama
Ollama runs on Docker.
`./mvnw` before executing the following command: various services, including Ollama, will be started by Docker.
```bash
npm run services:up
```