import BaseApplicationGenerator from 'generator-jhipster/generators/base-application';
import { javaMainPackageTemplatesBlock } from 'generator-jhipster/generators/java/support';
import command from './command.mjs';
export default class extends BaseApplicationGenerator {
  async beforeQueue() {
    await this.dependsOnJHipster('jhipster-llm:spring-ai');
  }

  get [BaseApplicationGenerator.INITIALIZING]() {
    return this.asInitializingTaskGroup({
      async initializingTemplateTask() {
        this.parseJHipsterArguments(command.arguments);
        this.parseJHipsterOptions(command.options);
      },
    });
  }

  get [BaseApplicationGenerator.WRITING]() {
    return this.asWritingTaskGroup({
      async writingTemplateTask({ application }) {
        await this.writeFiles({
          sections: {
            llm: [
              {
                ...javaMainPackageTemplatesBlock(),
                templates: [
                  'config/LlamaCppAutoConfiguration.java',
                  'config/LlamaCppProperties.java',
                  'service/llm/LlamaPrompt.java',
                  'service/llm/LlamaCppChatClient.java',
                ],
              },
            ],
          },
          context: application,
        });
      },
    });
  }

  get [BaseApplicationGenerator.POST_WRITING]() {
    return this.asPostWritingTaskGroup({
      async customizeApplicationYml({ application: { llmModelName } }) {
        this.editFile(`src/main/resources/config/application-dev.yml`, { ignoreNonExisting: true }, content =>
          content.replace(
            '\nspring:',
            `\nspring:
  ai:
    llama-cpp:
      model-home: '\${SPRING_AI_LLAMA_CPP_MODEL_HOME:\${user.home}/.cache/jhipster-llm/models}'
      model-name: '\${SPRING_AI_LLAMA_CPP_MODEL_NAME:${llmModelName}}'
    embedding:
      transformer:
        onnx.modelUri: '\${SPRING_AI_EMBEDDING_TRANSFORMER_ONNX_MODEL_URI:https://huggingface.co/intfloat/e5-small-v2/resolve/main/model.onnx}'
        tokenizer.uri: '\${SPRING_AI_EMBEDDING_TRANSFORMER_TOKENIZER_URI:https://huggingface.co/intfloat/e5-small-v2/raw/main/tokenizer.json}'`,
          ),
        );
        this.editFile(`src/main/resources/config/application-prod.yml`, { ignoreNonExisting: true }, content =>
          content.replace(
            '\nspring:',
            `\nspring:
  ai:
    llama-cpp:
      model-home: '\${SPRING_AI_LLAMA_CPP_MODEL_HOME:/models}' # docker volume
      model-name: '\${SPRING_AI_LLAMA_CPP_MODEL_NAME:${llmModelName}}'
    embedding:
      transformer:
        onnx.modelUri: '\${SPRING_AI_EMBEDDING_TRANSFORMER_ONNX_MODEL_URI:https://huggingface.co/intfloat/e5-small-v2/resolve/main/model.onnx}'
        tokenizer.uri: '\${SPRING_AI_EMBEDDING_TRANSFORMER_TOKENIZER_URI:https://huggingface.co/intfloat/e5-small-v2/raw/main/tokenizer.json}'`,
          ),
        );
      },
    });
  }
}
