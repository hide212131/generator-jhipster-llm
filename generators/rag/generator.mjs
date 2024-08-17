import BaseApplicationGenerator from 'generator-jhipster/generators/base-application';
import { moveToJavaPackageSrcDir } from 'generator-jhipster/generators/java/support';
import command from './command.mjs';
import yaml from 'yaml';

export default class extends BaseApplicationGenerator {
  constructor(args, opts, features) {
    super(args, opts, { ...features, sbsBlueprint: true });
  }

  async beforeQueue() {
    await this.dependsOnJHipster('server');
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
    return this.asConfiguringTaskGroup({
      async setProdDatabaseType({ application }) {
        application.prodDatabaseType = 'postgresql';
      },
      loadDependabot() {
        const { dependencies } = this.fs.readJSON(this.templatePath('../resources/package.json'));
        this.addDependencies = dependencies;
      },
    });
  }

  get [BaseApplicationGenerator.PROMPTING]() {
    return this.asPromptingTaskGroup({
      async promptingTemplateTask() {
        const prompts = [
          {
            type: 'confirm',
            name: 'enableRAG',
            message: 'Do you want to enable RAG (Retrieval-Augmented Generation) feature?',
            default: true,
          },
        ];

        const props = await this.prompt(prompts);
        this.blueprintConfig.enableRAG = props.enableRAG;
      },
    });
  }

  get [BaseApplicationGenerator.WRITING]() {
    return this.asWritingTaskGroup({
      async writingTemplateTask({ application }) {
        if (this.blueprintConfig.enableRAG) {
          await this.writeFiles({
            sections: {
              rag: [
                {
                  path: `src/main/java/_package_/`,
                  renameTo: moveToJavaPackageSrcDir,
                  templates: ['config/CustomPgVectorStoreConfiguration.java', 'service/RAGService.java'],
                },
              ],
            },
            context: application,
          });
        }
      },
    });
  }

  get [BaseApplicationGenerator.POST_WRITING]() {
    return this.asPostWritingTaskGroup({
      async customizeBuildTool({ source, application }) {
        if (this.blueprintConfig.enableRAG) {
          if (application.buildToolGradle) {
            source.addGradleDependency({
              group: 'org.springframework.ai',
              name: 'spring-ai-transformers',
              version: '${springAi.version}',
            });
            source.addGradleDependency({
              group: 'org.springframework.ai',
              name: 'spring-ai-transformers-spring-boot-starter',
              version: '${springAi.version}',
            });
          } else {
            source.addMavenDependency({
              groupId: 'org.springframework.ai',
              artifactId: 'spring-ai-transformers',
              version: '${springAi.version}',
            });
            source.addMavenDependency({
              groupId: 'org.springframework.ai',
              artifactId: 'spring-ai-transformers-spring-boot-starter',
              version: '${springAi.version}',
            });
            source.addMavenDependency({
              groupId: 'org.springframework.ai',
              artifactId: 'spring-ai-pgvector-store',
              version: '${springAi.version}',
            });
            source.addMavenDependency({
              groupId: 'org.springframework.ai',
              artifactId: 'spring-ai-pdf-document-reader',
              version: '${springAi.version}',
            });
          }
        }
      },
      async customizeDockerServices() {
        if (this.blueprintConfig.enableRAG) {
          this.editFile('src/main/docker/postgresql.yml', content => {
            return content.replace(/image: postgres:16\.[0-9]+/, 'image: pgvector/pgvector:pg16');
          });
        }
      },
      async customizeApplicationDevYml() {
        if (this.blueprintConfig.enableRAG) {
          this.editFile(`src/main/resources/config/application-dev.yml`, { ignoreNonExisting: true }, content => {
            const doc = yaml.parseDocument(content);
            const newDoc = yaml.parseDocument(
              `spring:
  ai:
    vectorstore:
      pgvector:
        initialize-schema: true  
        # JHipter-LLM's own definition, not the standard definition          
        customize:
          # Second data source used only to enable auto-commit
          datasource:
            type: com.zaxxer.hikari.HikariDataSource
            url: jdbc:postgresql://localhost:5432/jhipster
            username: jhipster
            password:
            hikari:
              poolName: HikariWithAutoCommit
              auto-commit: true
    `,
            );
            if (doc.getIn(['spring', 'ai'])) {
              doc.setIn(['spring', 'ai', 'vectorstore'], newDoc.getIn(['spring', 'ai', 'vectorstore']));
            } else {
              doc.setIn(['spring', 'ai'], newDoc.getIn(['spring', 'ai']));
            }
            return doc.toString();
          });
        }
      },
      async customizePackageJson() {
        this.packageJson.merge({
          dependencies: this.addDependencies,
        });
      },
      async customizeClientEntity({ application }) {
        if (this.blueprintConfig.enableRAG) {
          await this.writeFiles({
            sections: {
              rag: [
                {
                  path: `src/main/webapp/app/entities/document-asset/`,
                  templates: ['document-asset.tsx'],
                },
              ],
            },
            context: application,
          });
        }
      },
      async customizeController({ application }) {
        if (this.blueprintConfig.enableRAG) {
          this.editFile(`${application.javaPackageSrcDir}web/rest/chat/ChatApiController.java`, content =>
            content
              .replace(
                'import com.mycompany.myapp.service.api.dto.*;',
                `import com.mycompany.myapp.service.api.dto.*;
import com.mycompany.myapp.service.RAGService;
`,
              )
              .replace(
                'private final StreamingChatModel chatClient;',
                `private final StreamingChatModel chatClient;

    private final RAGService ragService;
`,
              )
              .replace(
                /ChatApiController\([\s\S]*?StreamingChatModel chatClient[\s\S]*?\) {/,
                `ChatApiController(StreamingChatModel chatClient, RAGService ragService) {`,
              )
              .replace(
                'this.chatClient = chatClient;',
                `this.chatClient = chatClient;
        this.ragService = ragService;`,
              )
              .replace(
                'SseEmitter emitter = new SseEmitter();',
                `// search related contents from vector store
        // Here, as a provisional behavior, RAG works when the "gpt-4k" model is used.
        if (createChatCompletionRequest.getModel().equals(CreateChatCompletionRequest.ModelEnum._4)) {
            prompt = ragService.retrieveAndGeneratePrompt(prompt);
        }

        SseEmitter emitter = new SseEmitter();`,
              ),
          );
        }
      },
    });
  }
}

export { command };
