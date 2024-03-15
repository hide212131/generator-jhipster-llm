import { XMLParser } from 'fast-xml-parser';

/**
 * Get the elements of the pom file
 * @param {*} pomContent
 * @returns {Object} The elements of the pom file
 */
export const getPomElements = pomContent => {
  const options = {
    stopNodes: ['*.plugin'],
  };
  const pom = new XMLParser(options).parse(pomContent);
  return {
    repositories: pom.project.repositories?.repository || [],
    dependencies: pom.project.dependencies?.dependency || [],
    dependencyManagement: pom.project.dependencyManagement?.dependencies?.dependency || [],
    buildPlugin: pom.project.build?.plugins?.plugin || [],
    properties: pom.project.properties || {},
  };
};
