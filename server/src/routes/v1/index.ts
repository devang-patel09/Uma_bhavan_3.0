import { Router, Request, Response } from 'express';
import { authRouter } from './auth.routes.js';
import { areaRouter } from './area.routes.js';
import { surnameRouter } from './surname.routes.js';
import { firmRouter } from './firm.routes.js';
import { memberRouter } from './member.routes.js';
import { receiptRouter } from './receipt.routes.js';
import { reportRouter } from './report.routes.js';
import { dataOpsRouter } from './dataOps.routes.js';
import { backupRouter } from './backup.routes.js';
import { auditRouter } from './audit.routes.js';

export const v1Router = Router();

// Version 1 API index
v1Router.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'Uma Bhavan Community Management API v1',
    status: 'active',
  });
});

// Modules
v1Router.use('/auth', authRouter);
v1Router.use('/areas', areaRouter);
v1Router.use('/surnames', surnameRouter);
v1Router.use('/firms', firmRouter);
v1Router.use('/members', memberRouter);
v1Router.use('/receipts', receiptRouter);
v1Router.use('/reports', reportRouter);
v1Router.use('/data-ops', dataOpsRouter);
v1Router.use('/backups', backupRouter);
v1Router.use('/audit', auditRouter);

