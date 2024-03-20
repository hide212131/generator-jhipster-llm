import BaseApplicationGenerator from 'generator-jhipster/generators/base-application';
import { javaMainPackageTemplatesBlock, moveToJavaPackageSrcDir } from 'generator-jhipster/generators/java/support';
import command from './command.mjs';
import { getPomVersionProperties } from 'generator-jhipster/generators/server/support';

export default class extends BaseApplicationGenerator {
  constructor(args, opts, features) {
    super(args, opts, { ...features, sbsBlueprint: true });
  }
  async beforeQueue() {
    await this.dependsOnJHipster('server');
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
          [
            {
              type: 'list',
              name: 'llmLibrary',
              message: 'Which LLM library do you want to use?',
              choices: [
                {
                  value: 'llamacpp',
                  name: 'Java Bindings for llama.cpp',
                },
                {
                  value: 'ollama',
                  name: 'Ollama',
                },
              ],
              default: 'llamacpp',
            },
          ],
          this.blueprintStorage,
        );
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
                path: './',
                templates: ['models/download-model.mjs', 'models/README.md', 'build-chat.mjs'],
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
        this.editFile(`src/main/resources/config/application-dev.yml`, { ignoreNonExisting: true }, content =>
          content.replace(
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
      async customizeBuildTool({ source, application: { buildToolMaven, buildToolGradle, javaDependencies, reactive } }) {
        // add required third party dependencies
        if (buildToolMaven) {
          source.addMavenProperty?.({ property: 'spring-ai.version', value: javaDependencies['spring-ai'] });
          source.addMavenRepository?.([
            {
              id: 'spring-milestones',
              name: 'Spring Milestones',
              url: 'https://repo.spring.io/milestone',
            },
            {
              id: 'spring-snapshots',
              name: 'Spring Snapshots',
              url: 'https://repo.spring.io/snapshot',
            },
          ]);
          source.addMavenDependency?.({
            groupId: 'org.springframework.ai',
            artifactId: 'spring-ai-core',
            version: '${spring-ai.version}',
          });
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
        } else if (buildToolGradle) {
          // TODO
        }
      },
    });
  }

  get [BaseApplicationGenerator.COMPOSING]() {
    return this.asComposingTaskGroup({
      async composingTemplateTask() {
        if (this.blueprintConfig.llmLibrary === 'llamacpp') {
          await this.composeWithJHipster(`jhipster-llm:spring-ai-llamacpp`);
        } else {
          await this.composeWithJHipster(`jhipster-llm:spring-ai-ollama`);
        }
      },
    });
  }
}
