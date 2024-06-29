import FrontendPluginGenerator from 'generator-jhipster/generators/maven/generators/frontend-plugin';

export default class extends FrontendPluginGenerator {
  constructor(args, opts, features) {
    super(args, opts, { ...features, sbsBlueprint: true });
  }

  get [FrontendPluginGenerator.POST_WRITING]() {
    return this.asPostWritingTaskGroup({
      async customizeBuildTool({ application: { buildToolMaven } }) {
        if (buildToolMaven) {
          this.editFile(`pom.xml`, content => {
            return content.replace(
              /(<profile>\s*<id>webapp<\/id>[\s\S]*?<artifactId>frontend-maven-plugin<\/artifactId>[\s\S]*?<\/execution>)(\s*<\/executions>)/,
              `$1
                            <execution>
                                <id>Download the integration test model if it doesn't exist</id>
                                <phase>generate-resources</phase>
                                <goals>
                                    <goal>npm</goal>
                                </goals>
                                <configuration>
                                    ${
                                      this.blueprintConfig.llmLibrary === 'llamacpp'
                                        ? '<arguments>run llm:download-model -- ${llm.model.home} ${llm.model.name} ${llm.model.url}</arguments>'
                                        : '<arguments>run llm:ollama pull ${llm.model.name}</arguments>'
                                    }
                                    <skip>false</skip>                                      
                                </configuration>
                            </execution>$2`,
            );
          });
        }
      },
    });
  }
}
