/**
 * useErpSchoolsPermissions — role_id allow-list for Schools module tabs.
 */

import { useMemo } from 'react';
import { useSchoolsSession } from './useSchoolsSession';
import { canAccessErpTab, getScopedErpTabs, type ErpTabKey } from '../utils/erpRoleScopes';

export function useErpSchoolsPermissions() {
  const { roleId, persona } = useSchoolsSession();
  const tabs = useMemo(() => getScopedErpTabs(roleId), [roleId]);

  return useMemo(
    () => ({
      roleId,
      persona,
      tabs,
      canAccess: (tab: ErpTabKey) => canAccessErpTab(roleId, tab),
    }),
    [roleId, persona, tabs],
  );
}
