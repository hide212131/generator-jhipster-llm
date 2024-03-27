import BaseApplicationGenerator from 'generator-jhipster/generators/base-application';
import command from './command.mjs';
export default class extends BaseApplicationGenerator {
  async beforeQueue() {
    await this.dependsOnJHipster('jhipster-llm:langchain4j');
  }

  get [BaseApplicationGenerator.INITIALIZING]() {
    return this.asInitializingTaskGroup({
      async initializingTemplateTask() {
        this.parseJHipsterArguments(command.arguments);
        this.parseJHipsterOptions(command.options);
      },
    });
  }

  get [BaseApplicationGenerator.POST_WRITING]() {
    return this.asPostWritingTaskGroup({
      async customizeApplicationYml({ application: { llmModelName } }) {
        this.editFile(`src/main/resources/config/application-dev.yml`, { ignoreNonExisting: true }, content =>
          content.replace(
            '\n# application:',
            `\n# application:
langchain4j:
  ollama:
    chat-model:
      model-name: ${llmModelName}
      base-url: http://localhost:11434
    streaming-chat-model:
      model-name: ${llmModelName}
      base-url: http://localhost:11434
    language-model:
      model-name: ${llmModelName}
      base-url: http://localhost:11434
`,
          ),
        );
      },
      async customizeBuildTool({ source, application: { buildToolMaven, buildToolGradle, llmModelName } }) {
        if (buildToolMaven) {
          source.addMavenProperty?.({ property: 'llm.model.name', value: llmModelName });
          source.addMavenDependency?.([
            {
              groupId: 'dev.langchain4j',
              artifactId: 'langchain4j',
              version: '${langchain4j.version}',
            },
            {
              groupId: 'dev.langchain4j',
              artifactId: 'langchain4j-ollama-spring-boot-starter',
              version: '${langchain4j.version}',
            },
          ]);
        } else if (buildToolGradle) {
          source.addGradleProperty?.({ property: 'llm.model.name', value: llmModelName });
          [
            {
              groupId: 'dev.langchain4j',
              artifactId: 'langchain4j',
              version: '${langchain4j.version}',
              scope: 'implementation',
            },
            {
              groupId: 'dev.langchain4j',
              artifactId: 'langchain4j-ollama-spring-boot-starter',
              version: '${langchain4j.version}',
              scope: 'implementation',
            },
          ].forEach(dependency => source.addGradleDependency?.(dependency));
        }
      },
    });
  }
}
