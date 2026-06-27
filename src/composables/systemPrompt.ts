import specContent from '../../noah-v1-spec.md?raw';

export function getSystemPrompt(currentProject?: string): string {
  let prompt = specContent;
  if (currentProject) {
    prompt += `\n\n---\n\n## 当前项目数据\n\n以下是用户当前项目的 JSON 数据。当用户要求修改某页时，请基于此数据进行增量更新，不要重新生成整个项目。\n\n\`\`\`json\n${currentProject}\n\`\`\``;
  }
  return prompt;
}
