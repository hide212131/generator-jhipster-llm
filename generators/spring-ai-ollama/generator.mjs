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
          {
            type: 'list',
            name: 'llmModelName',
            message: 'Would you like to use a LLM model (https://ollama.com/library)?',
            choices: retrieveOllamaModels(),
            default: 'mistral',
          },
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

  get [BaseApplicationGenerator.LOADING]() {
    return this.asLoadingTaskGroup({
      prepareForTemplates({ application }) {
        const { llmModelName } = this.blueprintConfig;
        application.llmModelName = llmModelName;
      },
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
                  'web/rest/chat/ModelsApiController.java',
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
                path: 'src/main/docker',
                templates: ['ollama.yml'],
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
      async customizeDockerServices() {
        this.editFile(`src/main/docker/services.yml`, { ignoreNonExisting: true }, contents =>
          contents.replace(
            '\nservices:',
            `\nservices:
  ollama:
    extends:
      file: ./ollama.yml
      service: ollama
  `,
          ),
        );
      },
      async customizePackageJson() {
        this.packageJson.merge({
          scripts: {
            'llm:ollama': 'docker exec -i ollama ollama',
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
      async customizeApplicationYml({ application: { llmModelName } }) {
        this.editFile(`src/main/resources/config/application-dev.yml`, { ignoreNonExisting: true }, content =>
          content
            .replace(
              '\nspring:',
              `\nspring:
  ai:
    ollama:
      chat.options.model: ${llmModelName}
`,
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
        this.editFile(`src/main/java/com/mycompany/myapp/config/SecurityConfiguration.java`, { ignoreNonExisting: true }, content =>
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
      async cusomizeMaven({ source, application: { llmPomAdditions, buildToolMaven, reactive, llmModelName } }) {
        if (buildToolMaven) {
          source.addMavenProperty?.(Object.entries(llmPomAdditions.properties).map(([property, value]) => ({ property, value })));
          source.addMavenProperty?.({ property: 'llm.model.name', value: llmModelName });
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

const retrieveOllamaModels = () => {
  return [
    { value: 'llama2', name: 'Llama 2 (7B, 3.8GB)' },
    { value: 'mistral', name: 'Mistral (7B, 4.1GB)' },
    { value: 'dolphin-phi', name: 'Dolphin Phi (2.7B, 1.6GB)' },
    { value: 'phi', name: 'Phi-2 (2.7B, 1.7GB)' },
    { value: 'neural-chat', name: 'Neural Chat (7B, 4.1GB)' },
    { value: 'starling-lm', name: 'Starling (7B, 4.1GB)' },
    { value: 'codellama', name: 'Code Llama (7B, 3.8GB)' },
    { value: 'llama2-uncensored', name: 'Llama 2 Uncensored (7B, 3.8GB)' },
    { value: 'llama2:13b', name: 'Llama 2 13B (13B, 7.3GB)' },
    { value: 'llama2:70b', name: 'Llama 2 70B (70B, 39GB)' },
    { value: 'orca-mini', name: 'Orca Mini (3B, 1.9GB)' },
    { value: 'vicuna', name: 'Vicuna (7B, 3.8GB)' },
    { value: 'llava', name: 'LLaVA (7B, 4.5GB)' },
    { value: 'gemma:2b', name: 'Gemma (2B, 1.4GB)' },
    { value: 'gemma:7b', name: 'Gemma (7B, 4.8GB)' },
  ];
};
