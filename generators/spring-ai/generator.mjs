import BaseApplicationGenerator from 'generator-jhipster/generators/base-application';
import command from './command.mjs';

export default class extends BaseApplicationGenerator {
  constructor(args, opts, features) {
    super(args, opts, { ...features, sbsBlueprint: true });
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
                  value: 'openai',
                  name: 'OpenAI',
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

  get [BaseApplicationGenerator.COMPOSING]() {
    return this.asComposingTaskGroup({
      async composingTemplateTask() {
        if (this.blueprintConfig.llmLibrary === 'llamacpp') {
          await this.composeWithJHipster(`jhipster-llm:spring-ai-llamacpp`);
        }
      },
    });
  }
}
