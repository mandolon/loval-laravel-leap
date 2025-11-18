// Helper function to format project AI identity for system prompt
export function formatProjectAIIdentity(aiIdentity: any, projectName?: string): string {
  if (!aiIdentity || typeof aiIdentity !== 'object') return '';
  
  let formatted = '**CURRENT PROJECT CONTEXT:**\n';
  
  if (projectName) {
    formatted += `Project: ${projectName}\n`;
  }
  
  // Project Type (handle both old string and new array format)
  if (aiIdentity.requiredProjectTypes && Array.isArray(aiIdentity.requiredProjectTypes)) {
    formatted += `- Project Types: ${aiIdentity.requiredProjectTypes.join(', ')}\n`;
  } else if (aiIdentity.projectType) {
    formatted += `- Project Type: ${aiIdentity.projectType}\n`;
  }
  
  // Basic Info
  if (aiIdentity.jurisdiction) formatted += `- Jurisdiction: ${aiIdentity.jurisdiction}\n`;
  if (aiIdentity.projectScope) formatted += `- Scope: ${aiIdentity.projectScope}\n`;
  
  // Zoning & Regulations
  if (aiIdentity.zoning) formatted += `- Zoning: ${aiIdentity.zoning}\n`;
  if (aiIdentity.lotSize) formatted += `- Lot Size: ${aiIdentity.lotSize} sqft\n`;
  if (aiIdentity.existingSqft) formatted += `- Existing: ${aiIdentity.existingSqft} sqft\n`;
  if (aiIdentity.proposedSqft) formatted += `- Proposed: ${aiIdentity.proposedSqft} sqft\n`;
  
  // Setbacks
  if (aiIdentity.setbacks) {
    formatted += `- Setbacks: Front ${aiIdentity.setbacks.front}', Rear ${aiIdentity.setbacks.rear}', Side ${aiIdentity.setbacks.side}'\n`;
  }
  
  if (aiIdentity.heightLimit) formatted += `- Height Limit: ${aiIdentity.heightLimit}'\n`;
  
  // Compliance
  if (aiIdentity.requiredCompliance && aiIdentity.requiredCompliance.length > 0) {
    formatted += `- Required Compliance: ${aiIdentity.requiredCompliance.join(', ')}\n`;
  }
  
  // Consultants
  if (aiIdentity.requiredConsultants && aiIdentity.requiredConsultants.length > 0) {
    formatted += `- Required Consultants: ${aiIdentity.requiredConsultants.join(', ')}\n`;
  }
  
  // Current Status
  if (aiIdentity.nextSteps && aiIdentity.nextSteps.length > 0) {
    formatted += `- Next Steps: ${aiIdentity.nextSteps.join('; ')}\n`;
  }
  
  if (aiIdentity.blockers && aiIdentity.blockers.length > 0) {
    formatted += `- Blockers: ${aiIdentity.blockers.join('; ')}\n`;
  }
  
  if (aiIdentity.openQuestions && aiIdentity.openQuestions.length > 0) {
    formatted += `- Open Questions: ${aiIdentity.openQuestions.join('; ')}\n`;
  }
  
  return formatted;
}
