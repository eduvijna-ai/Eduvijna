export function computeStackValidationStatus(branches) {
  const exportFailures = branches.some((b) =>
    Object.values(b.exports ?? {}).some((e) => e.exitCode !== 0),
  );
  const toolFailures = branches.some((b) => b.diagnostics?.toolFailure);
  const diagnosticRegression = branches.some((b) => {
    const added = b.diagnostics?.identitiesAdded;
    if (!added) return false;
    const hasGenuineFields =
      added.tsGenuineAdded !== undefined || added.eslintGenuineAdded !== undefined;
    if (!hasGenuineFields) {
      const tsNew = added.tsAdded?.length ?? 0;
      const eslintNew = added.eslintAdded?.length ?? 0;
      return tsNew > 0 || eslintNew > 0;
    }
    const tsNew = added.tsGenuineAdded?.length ?? 0;
    const eslintNew = added.eslintGenuineAdded?.length ?? 0;
    const tsAmbiguous = added.tsClassification?.ambiguous?.length ?? 0;
    const eslintAmbiguous = added.eslintClassification?.ambiguous?.length ?? 0;
    return tsNew > 0 || eslintNew > 0 || tsAmbiguous > 0 || eslintAmbiguous > 0;
  });
  const headMismatch = branches.some((b) => !b.headMatchesOrigin);

  const status = exportFailures
    ? 'export_failures'
    : toolFailures
      ? 'diagnostic_tool_failure'
      : headMismatch
        ? 'head_sha_mismatch'
        : diagnosticRegression
          ? 'diagnostic_regression'
          : 'passed';

  return {
    status,
    exportStatus: exportFailures ? 'failed' : 'passed',
    diagnosticStatus: toolFailures
      ? 'tool_failure'
      : diagnosticRegression
        ? 'regression'
        : 'passed',
  };
}
