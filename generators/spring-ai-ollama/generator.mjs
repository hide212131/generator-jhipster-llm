import BaseApplicationGenerator from 'generator-jhipster/generators/base-application';
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

  get [BaseApplicationGenerator.POST_WRITING]() {
    return this.asPostWritingTaskGroup({
      async customizeApplicationYml({ application: { llmModelName } }) {
        this.editFile(`src/main/resources/config/application.yml`, { ignoreNonExisting: true }, content =>
          content.replace(
            '\nspring:',
            `\nspring:
  ai:
    ollama:
      chat.options.model: ${llmModelName}
`,
          ),
        );
      },
    });
  }
}
