import BaseApplicationGenerator from 'generator-jhipster/generators/base-application';
import command from './command.mjs';
import { getPomVersionProperties } from 'generator-jhipster/generators/server/support';

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

  get [BaseApplicationGenerator.POST_WRITING]() {
    return this.asPostWritingTaskGroup({
      async customizeBuildTool({ source, application: { buildToolMaven, buildToolGradle, javaDependencies } }) {
        if (buildToolMaven) {
          source.addMavenProperty?.({ property: 'springAi.version', value: javaDependencies['springAi'] });
          source.addMavenDependency?.({
            groupId: 'org.springframework.ai',
            artifactId: 'spring-ai-ollama-spring-boot-starter',
            version: '${springAi.version}',
          });
        } else if (buildToolGradle) {
          source.addGradleDependency?.({
            groupId: 'org.springframework.ai',
            artifactId: 'spring-ai-ollama-spring-boot-starter',
            version: '${springAiVersion}',
            scope: 'implementation',
          });
        }
      },
      async customizeApplicationYml({ application: { llmModelName } }) {
        this.editFile(`src/main/resources/config/application.yml`, { ignoreNonExisting: true }, content =>
          content.replace(
            '\nspring:\n  application:',
            `
spring:
  ai:
    ollama:
      base-url: \${OLLAMA_URL:http://localhost:11434/}
      chat.options.model: ${llmModelName}
  application:`,
          ),
        );
      },
      // https://github.com/spring-projects/spring-ai/issues/563 workaround
      async customizeReactiveConfiguration({ application }) {
        if (application.reactive) {
          // import import org.springframework.web.client.RestClient;
          this.editFile(`${application.javaPackageSrcDir}config/WebConfigurer.java`, { ignoreNonExisting: true }, content =>
            content
              .replace(
                'import',
                `import org.springframework.web.client.RestClient;
import`,
              )
              .replace(
                '@Bean',
                `// https://github.com/spring-projects/spring-ai/issues/563 workaround
    @Bean
    public RestClient.Builder restClientBuilder() {
        return RestClient.builder();
    }
        
    @Bean`,
              ),
          );
        }
      },
    });
  }
}
