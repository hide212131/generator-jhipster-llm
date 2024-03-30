import BaseApplicationGenerator from 'generator-jhipster/generators/base-application';
import { moveToJavaPackageSrcDir } from 'generator-jhipster/generators/java/support';
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
                condition: generator => generator.clientFrameworkAny,
                path: `src/main/java/_package_/`,
                renameTo: moveToJavaPackageSrcDir,
                templates: [data => `web/rest/chat/ChatApiController_${data.imperativeOrReactive}.java`],
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
      async customizeBuildTool({ source, application: { buildToolMaven, buildToolGradle, javaDependencies } }) {
        if (buildToolMaven) {
          source.addMavenProperty?.({ property: 'langchain4j.version', value: javaDependencies['langchain4j'] });
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
          source.addGradleProperty?.({ property: 'langchain4jVersion', value: javaDependencies['langchain4j'] });
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

  get [BaseApplicationGenerator.COMPOSING]() {
    return this.asComposingTaskGroup({
      async composingTemplateTask() {
        if (this.blueprintConfig.llmLibrary === 'llamacpp') {
          await this.composeWithJHipster(`jhipster-llm:llamacpp`);
          await this.composeWithJHipster(`jhipster-llm:langchain4j-llamacpp`);
        } else {
          await this.composeWithJHipster(`jhipster-llm:ollama`);
          await this.composeWithJHipster(`jhipster-llm:langchain4j-ollama`);
        }
      },
    });
  }
}
