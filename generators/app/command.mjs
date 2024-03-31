/**
 * @type {import('generator-jhipster').JHipsterCommandDefinition}
 */
const command = {
  options: {
    llmFramework: {
      description: 'LLM framework',
      type: String,
      scope: 'blueprint',
    },
    llmLibrary: {
      description: 'LLM library',
      type: String,
      scope: 'blueprint',
    },
    llmModelName: {
      description: 'LLM model',
      type: String,
      scope: 'blueprint',
    },
  },
};

export default command;
