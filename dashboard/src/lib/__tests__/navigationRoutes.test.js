import { describe, expect, it } from 'vitest';
import { flattenNavItems, NAV_GROUPS } from '../navigation';
import { filterNavGroups } from '../permissions';
import { pageIdFromPath, pathForPage } from '../routing/appRoutes';

describe('existing navigation', () => {
  it('exposes the cheque and document pages that already exist', () => {
    const ids = flattenNavItems().map((item) => item.id);
    expect(ids).toContain('checks');
    expect(ids).toContain('documents');
  });

  it('hides pages the current user cannot open', () => {
    const groups = filterNavGroups(NAV_GROUPS, {
      permissions: 'view_client',
      is_admin: false,
      is_owner: false,
    });
    const ids = groups.flatMap((group) => group.items.map((item) => item.id));
    expect(ids).toContain('clients');
    expect(ids).toContain('documents');
    expect(ids).not.toContain('checks');
    expect(ids).not.toContain('reports');
  });

  it('restores an existing page from its path', () => {
    expect(pageIdFromPath('/')).toBe('dashboard');
    expect(pageIdFromPath('/documents')).toBe('documents');
    expect(pageIdFromPath('/reports')).toBe('reports');
    expect(pageIdFromPath('/cheques')).toBe('checks');
    expect(pageIdFromPath('/cheques/abc')).toBe('checks');
    expect(pathForPage('checks')).toBe('/cheques');
    expect(pathForPage('documents')).toBe('/documents');
  });
});
