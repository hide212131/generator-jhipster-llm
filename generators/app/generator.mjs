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
              name: 'llmFramework',
              message: 'Which LLM framwork do you want to use?',
              choices: [
                {
                  value: 'springai',
                  name: 'Spring AI',
                },
                {
                  value: 'langchain4j',
                  name: 'LangChain4j',
                },
              ],
              default: 'springai',
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
        await this.composeWithJHipster(`jhipster-llm:endpoint`);
        if (this.blueprintConfig.llmFramework === 'springai') {
          await this.composeWithJHipster(`jhipster-llm:spring-ai`);
        } else {
          await this.composeWithJHipster(`jhipster-llm:langchain4j`);
        }
      },
    });
  }
}
