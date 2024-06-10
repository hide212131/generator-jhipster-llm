import BaseApplicationGenerator from 'generator-jhipster/generators/base-application';
import command from './command.mjs';
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
            message: 'Which LLM model do you want to use (https://ollama.com/library)?',
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
        application.llmModelName = llmModelName;
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
                path: 'src/main/docker',
                templates: ['ollama.yml'],
              },
              {
                condition: generator => generator.buildToolGradle,
                templates: ['gradle/llm.gradle'],
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
      async customizeDockerServices({ source }) {
        source.addDockerExtendedServiceToApplicationAndServices({ serviceName: 'ollama' });
      },
      async customizePackageJson({ application }) {
        this.packageJson.merge({
          scripts: {
            'services:up': `docker compose -f ${application.dockerServicesDir}services.yml up --wait`,
            'llm:ollama': 'docker exec -i ollama ollama',
          },
        });
      },
      async customizeBuildTool({ source, application: { buildToolMaven, buildToolGradle, llmModelName, llmModelUrl } }) {
        if (buildToolMaven) {
          source.addMavenProperty?.([
            { property: 'llm.model.home', value: 'models' },
            { property: 'llm.model.name', value: llmModelName },
          ]);
        } else if (buildToolGradle) {
          [
            { property: 'llm.model.home', value: 'models' },
            { property: 'llm.model.name', value: llmModelName },
          ].forEach(({ property, value }) => source.addGradleProperty?.({ property, value }));
          source.applyFromGradle?.({ script: 'gradle/llm.gradle' });
        }
      },
    });
  }
}

const retrieveModels = [
  { value: 'mistral', name: 'Mistral (7B, 4.1GB)' },
  { value: 'llama2', name: 'Llama 2 (7B, 3.8GB)' },
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
