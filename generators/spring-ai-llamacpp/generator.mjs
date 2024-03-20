import BaseApplicationGenerator from 'generator-jhipster/generators/base-application';
import { javaMainPackageTemplatesBlock } from 'generator-jhipster/generators/java/support';
import command from './command.mjs';
import { getPomVersionProperties } from 'generator-jhipster/generators/server/support';
export default class extends BaseApplicationGenerator {
  async beforeQueue() {
    await this.dependsOnJHipster('jhipster-llm:spring-ai');
  }

  get [BaseApplicationGenerator.PREPARING]() {
    return this.asPreparingTaskGroup({
      async defaultTask({ application }) {
        const pomFile = this.readTemplate(this.templatePath('../resources/pom.xml'));
        // TODO use application.javaDependencies
        const versions = getPomVersionProperties(pomFile);
        application.javaDependencies = this.prepareDependencies({
          ...application.javaDependencies,
          ...versions,
        });
      },
    });
  }

  get [BaseApplicationGenerator.INITIALIZING]() {
    return this.asInitializingTaskGroup({
      async initializingTemplateTask() {
        this.parseJHipsterArguments(command.arguments);
        this.parseJHipsterOptions(command.options);
      },
    });
  }

  get [BaseApplicationGenerator.PROMPTING]() {
    return this.asPromptingTaskGroup({
      async promptingTemplateTask() {
        await this.prompt(
          {
            type: 'list',
            name: 'llmModelName',
            message: 'Would you like to use a LLM model (https://ollama.com/library)?',
            choices: retrieveModels,
            default: 'mistral',
          },
          this.blueprintStorage,
        );
      },
    });
  }

  get [BaseApplicationGenerator.LOADING]() {
    return this.asLoadingTaskGroup({
      prepareForTemplates({ application }) {
        const { llmModelName } = this.blueprintConfig;
        application.llmModelUrl = retrieveModels.find(model => model.value === llmModelName).url;
        application.llmModelName = application.llmModelUrl.split('/').pop();
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
        await this.copyTemplateAsync('../resources/base/{**,**/.*}', this.destinationPath());
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
      model-home: '\${SPRING_AI_LLAMA_CPP_MODEL_HOME:models}'
      model-name: '\${SPRING_AI_LLAMA_CPP_MODEL_NAME:${llmModelName}}'
    embedding:
      transformer:
        onnx.modelUri: '\${SPRING_AI_EMBEDDING_TRANSFORMER_ONNX_MODEL_URI:https://huggingface.co/intfloat/e5-small-v2/resolve/main/model.onnx}'
        tokenizer.uri: '\${SPRING_AI_EMBEDDING_TRANSFORMER_TOKENIZER_URI:https://huggingface.co/intfloat/e5-small-v2/raw/main/tokenizer.json}'`,
          ),
        );
      },
      async customizeBuildTool({ source, application: { buildToolMaven, javaDependencies, llmModelName, llmModelUrl } }) {
        if (buildToolMaven) {
          source.addMavenProperty?.({ property: 'java-llamacpp.version', value: javaDependencies['java-llamacpp'] });
          source.addMavenProperty?.({ property: 'llm.model.home', value: '${project.basedir}/models' });
          source.addMavenProperty?.({ property: 'llm.model.name', value: llmModelName });
          source.addMavenProperty?.({ property: 'llm.model.url', value: llmModelUrl });
          source.addMavenDependency?.({
            groupId: 'de.kherud',
            artifactId: 'llama',
            version: '${java-llamacpp.version}',
          });
          source.addMavenPlugin?.({
            additionalContent: `
            <groupId>com.github.eirslett</groupId>
            <artifactId>frontend-maven-plugin</artifactId>
            <configuration>
                <skip>false</skip>
            </configuration>                  
            <executions>
                <execution>
                    <id>Download the integration test model if it doesn't exist</id>
                    <phase>generate-resources</phase>
                    <goals>
                        <goal>npm</goal>
                    </goals>
                    <configuration>
                        <arguments>run llm:download-model -- \${llm.model.home} \${llm.model.name} \${llm.model.url}</arguments>
                    </configuration>
                </execution>
            </executions>
          `,
          });
        }
      },
    });
  }
}

const retrieveModels = [
  {
    value: 'mistral',
    name: 'Mistral (7B, 4.1GB)',
    url: 'https://huggingface.co/TheBloke/Mistral-7B-Instruct-v0.2-GGUF/resolve/main/mistral-7b-instruct-v0.2.Q4_0.gguf',
  },
  {
    value: 'llama2',
    name: 'Llama 2 (7B, 3.8GB)',
    url: 'https://huggingface.co/TheBloke/Llama-2-7B-Chat-GGUF/resolve/main/llama-2-7b-chat.Q4_0.gguf',
  },
  {
    value: 'codellama',
    name: 'Code Llama (7B, 3.8GB)',
    url: 'https://huggingface.co/TheBloke/CodeLlama-7B-Instruct-GGUF/resolve/main/codellama-7b-instruct.Q4_0.gguf',
  },
];
