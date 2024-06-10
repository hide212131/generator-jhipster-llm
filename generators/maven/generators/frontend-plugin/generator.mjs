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
                                    <arguments>run llm:download-model -- \${project.basedir}/\${llm.model.home} \${llm.model.name} \${llm.model.url}</arguments>
                                </configuration>
                            </execution>$2`,
            );
          });
        }
      },
    });
  }
}