import BaseApplicationGenerator from 'generator-jhipster/generators/base-application';
import command from './command.mjs';
import fetch from 'node-fetch';
import { load } from 'cheerio';

export default class extends BaseApplicationGenerator {
  get [BaseApplicationGenerator.INITIALIZING]() {
    return this.asInitializingTaskGroup({
      async initializingTemplateTask() {
        this.parseJHipsterArguments(command.arguments);
        this.parseJHipsterOptions(command.options);
      },
    });
  }

  async retrieveModels() {
    try {
      const response = await fetch('https://ollama.com/library');
      const html = await response.text();
      const $ = load(html);

      const models = [];

      $('li.flex.items-baseline').each((index, element) => {
        const name = $(element).find('h2').text().trim();
        const description = $(element).find('p.max-w-md').text().trim();
        const link = $(element).find('a').attr('href');

        models.push({ name, description, link });
      });

      return models;
    } catch (error) {
      console.error('Error fetching models:', error);
      return [{ name: 'mistral', description: 'Fallback option', link: '/library/mistral' }];
    }
  }

  async retrieveModelVariants(modelLink) {
    try {
      const response = await fetch(`https://ollama.com${modelLink}`);
      const html = await response.text();
      const $ = load(html);

      const variants = [];
      $('#secondary-tags a').each((index, element) => {
        const variantName = $(element).find('span[title]').attr('title');
        const size = $(element).find('span.text-neutral-400').text().trim();
        variants.push({ value: variantName, name: `${variantName} (${size})` });
      });

      return variants.length > 0 ? variants : [{ value: modelLink.split('/').pop(), name: 'Default' }];
    } catch (error) {
      console.error('Error fetching model variants:', error);
      return [{ value: modelLink.split('/').pop(), name: 'Default (Error occurred)' }];
    }
  }

  get [BaseApplicationGenerator.PROMPTING]() {
    return this.asPromptingTaskGroup({
      async promptingTemplateTask() {
        const models = await this.retrieveModels();

        const { selectedModel } = await this.prompt({
          type: 'list',
          name: 'selectedModel',
          message: 'Which LLM model do you want to use?',
          choices: models.map(model => ({ name: `${model.name} - ${model.description}`, value: model })),
        });

        const variants = await this.retrieveModelVariants(selectedModel.link);

        const { selectedParam } = await this.prompt({
          type: 'list',
          name: 'selectedParam',
          message: `Select a variant for ${selectedModel.name}:`,
          choices: variants,
        });

        this.blueprintConfig.llmModelName = `${selectedModel.name}:${selectedParam}`;
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
      async customizeBuildTool({ source, application: { buildToolMaven, buildToolGradle, llmModelName } }) {
        if (buildToolMaven) {
          source.addMavenProperty?.([
            { property: 'llm.model.home', value: '${env.JHIPSTER_LLM_MODELS_HOME:~/.cache/jhipster-llm/models}' },
            { property: 'llm.model.name', value: llmModelName },
          ]);
        } else if (buildToolGradle) {
          [
            { property: 'llm.model.home', value: '${env.JHIPSTER_LLM_MODELS_HOME:~/.cache/jhipster-llm/models}' },
            { property: 'llm.model.name', value: llmModelName },
          ].forEach(({ property, value }) => source.addGradleProperty?.({ property, value }));
          source.applyFromGradle?.({ script: 'gradle/llm.gradle' });
        }
      },
      async customizeDockerCompose() {
        this.editFile(`src/main/docker/app.yml`, { ignoreNonExisting: true }, content =>
          content.replace(
            'environment:',
            `environment:
      - OLLAMA_URL=http://ollama:11434`,
          ),
        );
      },
    });
  }
}
