const taskModel = require('../../../src/models/taskModel');
const userModel = require('../../../src/models/userModel');
const listModel = require('../../../src/models/listModel');
const workspaceModel = require('../../../src/models/workspaceModel');

describe('Task Model', () => {
  let user, workspace, list;

  beforeEach(async () => {
    user = await userModel.create({ name: 'Test', email: 'test@test.com', passwordHash: 'hash' });
    workspace = await workspaceModel.create({ name: 'Test WS', ownerId: user.id });
    list = await listModel.create({ name: 'Test List', workspaceId: workspace.id });
  });

  test('create and find task', async () => {
    const task = await taskModel.create({
      title: 'New Task',
      listId: list.id,
      createdBy: user.id
    });

    expect(task).toBeDefined();
    expect(task.title).toBe('New Task');
    expect(task.status).toBe('TODO');
    
    const found = await taskModel.findById(task.id);
    expect(found.title).toBe('New Task');
  });

  test('update task status', async () => {
    const task = await taskModel.create({
      title: 'New Task',
      listId: list.id,
      createdBy: user.id
    });

    const updated = await taskModel.updateStatus(task.id, 'IN_PROGRESS');
    expect(updated.status).toBe('IN_PROGRESS');
  });
});
