import * as brands from '../services/brandService.js';

const uid = (req) => req.user._id;

export async function createBrand(req, res) {
  res.status(201).json({ brand: await brands.createBrand(uid(req), req.body) });
}
export async function getBrands(req, res) {
  res.json({ brands: await brands.listBrands(uid(req)) });
}
export async function getBrand(req, res) {
  res.json({ brand: await brands.getBrand(uid(req), req.params.id) });
}
export async function updateBrand(req, res) {
  res.json({ brand: await brands.updateBrand(uid(req), req.params.id, req.body) });
}
export async function deleteBrand(req, res) {
  await brands.deleteBrand(uid(req), req.params.id);
  res.json({ message: 'Brand deleted.' });
}

export async function addSource(req, res) {
  res.status(201).json({ source: await brands.addSource(uid(req), req.params.id, { file: req.file, body: req.body }) });
}
export async function getSources(req, res) {
  res.json({ sources: await brands.listSources(uid(req), req.params.id) });
}
export async function getSource(req, res) {
  const source = await brands.getSource(uid(req), req.params.id, req.params.sourceId);
  res.json({ source: { ...source.toJSON(), content: source.content } });
}
export async function deleteSource(req, res) {
  await brands.deleteSource(uid(req), req.params.id, req.params.sourceId);
  res.json({ message: 'Source deleted.' });
}

export async function learn(req, res) {
  res.json(await brands.learnBrand(uid(req), req.params.id));
}
export async function getObservations(req, res) {
  res.json({ observations: await brands.listObservations(uid(req), req.params.id) });
}

export async function getRules(req, res) {
  res.json({ rules: await brands.listRules(uid(req), req.params.id, req.query.status) });
}
export async function createRule(req, res) {
  res.status(201).json({ rule: await brands.createRule(uid(req), req.params.id, req.body) });
}
export async function updateRule(req, res) {
  res.json({ rule: await brands.updateRule(uid(req), req.params.id, req.params.ruleId, req.body) });
}
export async function deleteRule(req, res) {
  await brands.deleteRule(uid(req), req.params.id, req.params.ruleId);
  res.json({ message: 'Rule deleted.' });
}
