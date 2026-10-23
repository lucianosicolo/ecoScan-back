import { NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';

import { HistorialService } from './historico-scan.service';
import type { historicoScanEntity } from './historico-scan.entity';
import type { UsersService } from '../users/users.service';

describe('HistorialService user isolation', () => {
  const repository = {
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  let service: HistorialService;

  beforeEach(() => {
    jest.clearAllMocks();

    service = new HistorialService(
      repository as unknown as Repository<historicoScanEntity>,
      {} as UsersService,
    );
  });

  it('only lists scans belonging to the current user', async () => {
    repository.find.mockResolvedValueOnce([]);

    await expect(service.findAll(7)).resolves.toEqual([]);
    expect(repository.find).toHaveBeenCalledWith({
      where: { user: { id: 7 } },
      order: { createdAt: 'DESC' },
    });
  });

  it('filters scan lookups by both the scan ID and user ID', async () => {
    repository.findOne.mockResolvedValueOnce(null);

    await expect(service.findOne(15, 7))
      .rejects.toThrow(NotFoundException);

    expect(repository.findOne).toHaveBeenCalledWith({
      where: { id: 15, user: { id: 7 } },
    });
  });

  it('refuses deletion if the scan does not belong to the user', async () => {
    repository.findOne.mockResolvedValueOnce(null);

    await expect(service.remove(15, 7))
      .rejects.toThrow(NotFoundException);
    expect(repository.remove).not.toHaveBeenCalled();
  });
});
