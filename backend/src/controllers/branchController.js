const prisma = require('../prismaClient');

class BranchController {
  /** GET /api/branches — public, returns active branches */
  async getAll(req, res) {
    const includeInactive = req.query.all === 'true' && req.user?.role === 'Admin';
    const branches = await prisma.branch.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    res.json(branches);
  }

  /** GET /api/branches/:id */
  async getOne(req, res) {
    const branch = await prisma.branch.findUnique({ where: { id: req.params.id } });
    if (!branch) { res.status(404); throw new Error('Branch not found'); }
    res.json(branch);
  }

  /** POST /api/branches — Admin only */
  async create(req, res) {
    const { name, address, city, latitude, longitude, phone, whatsapp, workingHours, mapUrl, isActive, sortOrder } = req.body;
    if (!name || !address || !city) {
      res.status(400); throw new Error('name, address, and city are required');
    }
    const branch = await prisma.branch.create({
      data: {
        name, address, city,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        phone: phone || null,
        whatsapp: whatsapp || null,
        workingHours: workingHours || null,
        mapUrl: mapUrl || null,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
        sortOrder: sortOrder !== undefined ? parseInt(sortOrder) : 0,
      },
    });
    res.status(201).json(branch);
  }

  /** PUT /api/branches/:id — Admin only */
  async update(req, res) {
    const { name, address, city, latitude, longitude, phone, whatsapp, workingHours, mapUrl, isActive, sortOrder } = req.body;
    const branch = await prisma.branch.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(address !== undefined && { address }),
        ...(city !== undefined && { city }),
        ...(latitude !== undefined && { latitude: latitude ? parseFloat(latitude) : null }),
        ...(longitude !== undefined && { longitude: longitude ? parseFloat(longitude) : null }),
        ...(phone !== undefined && { phone }),
        ...(whatsapp !== undefined && { whatsapp }),
        ...(workingHours !== undefined && { workingHours }),
        ...(mapUrl !== undefined && { mapUrl }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) }),
        ...(sortOrder !== undefined && { sortOrder: parseInt(sortOrder) }),
      },
    });
    res.json(branch);
  }

  /** DELETE /api/branches/:id — Admin only */
  async remove(req, res) {
    await prisma.branch.delete({ where: { id: req.params.id } });
    res.status(204).send();
  }
}

module.exports = new BranchController();
