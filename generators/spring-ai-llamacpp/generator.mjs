import BaseApplicationGenerator from 'generator-jhipster/generators/base-application';
import { javaMainPackageTemplatesBlock, moveToJavaPackageSrcDir } from 'generator-jhipster/generators/java/support';
import command from './command.mjs';
import { getPomElements } from './utils-maven.mjs';
export default class extends BaseApplicationGenerator {
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
          [
            {
              type: 'input',
              name: 'llmModelName',
              message: 'What is the name of the LLM model?',
              default: 'mistral-7b-instruct-v0.2.Q2_K.gguf',
            },
          ],
          this.blueprintStorage,
        );
      },
    });
  }

  get [BaseApplicationGenerator.CONFIGURING]() {
    return this.asConfiguringTaskGroup({
      async configuringTemplateTask() {},
    });
  }

  get [BaseApplicationGenerator.PREPARING]() {
    return this.asPreparingTaskGroup({
      async defaultTask({ application }) {
        const pomFile = this.readTemplate(this.templatePath('../resources/pom.xml'));
        application.llmPomAdditions = getPomElements(pomFile);
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
                  'config/ChatCompletionRequestMessageDeserializer.java',
                  'config/JacksonConfig.java',
                  'config/LlamaCppAutoConfiguration.java',
                  'config/LlamaCppProperties.java',
                  'web/rest/chat/ModelsApiController.java',
                  'service/llm/LlamaPrompt.java',
                  'service/llm/LlamaCppChatClient.java',
                ],
              },
              {
                condition: generator => generator.clientFrameworkAny,
                path: `src/main/java/_package_/`,
                renameTo: moveToJavaPackageSrcDir,
                templates: [
                  data => `web/rest/chat/ChatApiController_${data.imperativeOrReactive}.java`,
                  data => `web/rest/chat/ChatApi_${data.imperativeOrReactive}.java`,
                ],
              },
              {
                path: 'src/main/resources',
                templates: ['swagger/api.yml'],
              },
              {
                path: './',
                templates: ['models/download-model.mjs', 'models/README.md', 'build-chat.mjs'],
              },
            ],
          },
          context: application,
        });
        await this.copyTemplateAsync('../resources/base/{**,**/.*}', this.destinationPath());
      },
    });
  }

  get [BaseApplicationGenerator.WRITING_ENTITIES]() {
    return this.asWritingEntitiesTaskGroup({
      async writingEntitiesTemplateTask() {},
    });
  }

  get [BaseApplicationGenerator.POST_WRITING]() {
    return this.asPostWritingTaskGroup({
      async customizePackageJson() {
        this.packageJson.merge({
          scripts: {
            'llm:download-model': 'node models/download-model.mjs',
            'webapp:build:dev': 'webpack --config webpack/webpack.dev.js --env stats=minimal && npm run webapp:build:dev:chat --',
            'webapp:build:dev:chat': 'node build-chat.mjs',
          },
        });
      },
      async customizeMainApplication({ application: { mainJavaPackageDir, mainClass } }) {
        this.editFile(`${mainJavaPackageDir}${mainClass}.java`, { ignoreNonExisting: true }, contents =>
          contents
            .replace(
              "Application '{}' is running! Access URLs:",
              `Application '{}' is running! Access URLs:
                \\tChat: \\t\\t{}://localhost:{}{}chat-ui/index.html`,
            )
            .replace(
              'applicationName,',
              `applicationName,
            protocol,
            serverPort,
            contextPath,`,
            ),
        );
      },
      async customizeApplicationYml() {
        this.editFile(`src/main/resources/config/application-dev.yml`, content =>
          content
            .replace(
              '\nspring:',
              `\nspring:
  ai:
    llama-cpp:
      model-home: '\${SPRING_AI_LLAMA_CPP_MODEL_HOME:models}'
      model-name: '\${SPRING_AI_LLAMA_CPP_MODEL_NAME:mistral-7b-instruct-v0.2.Q2_K.gguf}'
    embedding:
      transformer:
        onnx.modelUri: '\${SPRING_AI_EMBEDDING_TRANSFORMER_ONNX_MODEL_URI:https://huggingface.co/intfloat/e5-small-v2/resolve/main/model.onnx}'
        tokenizer.uri: '\${SPRING_AI_EMBEDDING_TRANSFORMER_TOKENIZER_URI:https://huggingface.co/intfloat/e5-small-v2/raw/main/tokenizer.json}'`,
            )
            .replace(
              '\n# application:',
              `\n# application:
openapi.my-llm-app.base-path: /api/llm/v1
            `,
            ),
        );
      },
      async customizeSecurityConfig({ application: { reactive } }) {
        this.editFile(`src/main/java/com/mycompany/myapp/config/SecurityConfiguration.java`, content =>
          reactive
            ? content.replace('"/app/**",', `"/chat-ui/**", "/app/**",`).replace(
                '.pathMatchers("/api/**").authenticated()',
                `.pathMatchers("/api/llm/**").permitAll()
                      .pathMatchers("/api/**").authenticated()`,
              )
            : content.replace(
                '.requestMatchers(mvc.pattern("/api/**")).authenticated()',
                `.requestMatchers(mvc.pattern("/api/llm/**")).permitAll()
                    .requestMatchers(mvc.pattern("/chat-ui/**")).permitAll()
                    .requestMatchers(mvc.pattern("/api/**")).authenticated()`,
              ),
        );
      },
      async cusomizeMaven({ source, application: { llmPomAdditions, buildToolMaven, reactive } }) {
        if (buildToolMaven) {
          source.addMavenProperty?.(Object.entries(llmPomAdditions.properties).map(([property, value]) => ({ property, value })));
          source.addMavenRepository?.(llmPomAdditions.repositories);
          source.addMavenDependency?.(llmPomAdditions.dependencies);
          source.addMavenPlugin?.({ additionalContent: llmPomAdditions.buildPlugin });
          this.editFile(`pom.xml`, content => {
            if (content.includes('<artifactId>openapi-generator-maven-plugin</artifactId>')) {
              content = content.replace(
                '<version>${openapi-generator-maven-plugin.version}</version>',
                `<version>\${openapi-generator-maven-plugin.version}</version>
                <configuration>
                    <typeMappings>integer=Long,int=Long</typeMappings>
                </configuration>`,
              );
              content = content.replace(
                '</useSpringBoot3>',
                `</useSpringBoot3>                
                <interfaceOnly>true</interfaceOnly>
                <openApiNullable>false</openApiNullable>
                ${!reactive ? '<reactive>true</reactive>' : ''}`, // for chat stream
              );
            }
            return content;
          });
        }
      },
    });
  }

  get [BaseApplicationGenerator.INSTALL]() {
    return this.asInstallTaskGroup({
      async installTemplateTask() {},
    });
  }

  get [BaseApplicationGenerator.END]() {
    return this.asEndTaskGroup({
      async endTemplateTask() {},
    });
  }
}
