import { describe, expect, it } from 'vitest';

import { describeDatabaseTarget } from './database-target';

describe('describeDatabaseTarget', () => {
  it('keeps only the host and the database name', () => {
    expect(describeDatabaseTarget('mongodb://mongodb:27017', 'sfl')).toBe(
      'mongodb:27017/sfl',
    );
  });

  it('drops the user name and password of an Atlas URL', () => {
    const result = describeDatabaseTarget(
      'mongodb+srv://admin:s3cret@cluster0.abc.mongodb.net',
      'prod',
    );

    expect(result).toBe('cluster0.abc.mongodb.net/prod');
    expect(result).not.toContain('s3cret');
    expect(result).not.toContain('admin');
  });

  it('does not leak credentials of a multi-host URL either', () => {
    const result = describeDatabaseTarget(
      'mongodb://user:p%40ss@a.example:27017,b.example:27017/?replicaSet=rs0',
      'sfl',
    );

    expect(result).toBe('a.example:27017,b.example:27017/sfl');
    expect(result).not.toContain('p%40ss');
    expect(result).not.toContain('user');
  });
});
