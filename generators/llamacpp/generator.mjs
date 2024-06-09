import BaseApplicationGenerator from 'generator-jhipster/generators/base-application';
import command from './command.mjs';
import { getPomVersionProperties } from 'generator-jhipster/generators/server/support';
export default class extends BaseApplicationGenerator {
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
      loadDependabot() {
        const { devDependencies } = this.fs.readJSON(this.templatePath('../resources/package.json'));
        this.addDevDependencies = devDependencies;
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
            message: 'Which LLM model do you want to use ',
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
                condition: generator => generator.buildToolGradle,
                templates: ['gradle/llm.gradle'],
              },
              {
                path: './',
                templates: ['models/download-model.mjs', 'models/README.md'],
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
      async customizePackageJson() {
        this.packageJson.merge({
          devDependencies: this.addDevDependencies,
          scripts: {
            'llm:download-model': 'node models/download-model.mjs',
          },
        });
      },
      async customizeBuildTool({ source, application: { buildToolMaven, buildToolGradle, javaDependencies, llmModelName, llmModelUrl } }) {
        if (buildToolMaven) {
          source.addMavenProperty?.([
            { property: 'javaLlamacpp.version', value: javaDependencies['javaLlamacpp'] },
            { property: 'llm.model.home', value: 'models' },
            { property: 'llm.model.name', value: llmModelName },
            { property: 'llm.model.url', value: llmModelUrl },
          ]);
          source.addMavenDependency?.({
            groupId: 'de.kherud',
            artifactId: 'llama',
            version: '${javaLlamacpp.version}',
          });
        } else if (buildToolGradle) {
          [
            { property: 'javaLlamacppVersion', value: javaDependencies['javaLlamacpp'] },
            { property: 'llm.model.home', value: 'models' },
            { property: 'llm.model.name', value: llmModelName },
            { property: 'llm.model.url', value: llmModelUrl },
          ].forEach(({ property, value }) => source.addGradleProperty?.({ property, value }));
          source.addGradleDependency?.({
            groupId: 'de.kherud',
            artifactId: 'llama',
            version: '${javaLlamacppVersion}',
            scope: 'implementation',
          });
          source.applyFromGradle?.({ script: 'gradle/llm.gradle' });
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
