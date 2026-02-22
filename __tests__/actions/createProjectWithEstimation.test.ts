import assert from 'assert'
import { createProjectWithEstimationWithRpc, type CreateProjectDTO } from '@/app/actions/createProjectWithEstimation'

type Rpc = (fn: string, args: unknown) => Promise<{ data: unknown; error: { message: string } | null }>

{
  const dto: CreateProjectDTO = {
    customer_name: 'Dedi',
    phone: '081234567890',
    address: '',
    zone_id: null,
    custom_notes: null,
    status: 'New',
    estimation: {
      total_hpp: 1000000,
      margin_percentage: 30,
      total_selling_price: 1300000,
      status: 'draft'
    }
  }

  const rpc: Rpc = async (_fn, _args) => {
    void _fn; void _args
    return {
      data: { project_id: '11111111-1111-1111-1111-111111111111', estimation_id: '22222222-2222-2222-2222-222222222222' },
      error: null
    }
  }

  const res = await createProjectWithEstimationWithRpc(rpc, dto)
  assert.equal(res.project_id, '11111111-1111-1111-1111-111111111111')
  assert.equal(res.estimation_id, '22222222-2222-2222-2222-222222222222')
}

{
  const dto: CreateProjectDTO = {
    customer_name: 'Budi',
    phone: '081111111111',
    address: '',
    zone_id: null,
    custom_notes: null,
    status: 'New',
    estimation: {
      total_hpp: 1000000,
      margin_percentage: 30,
      total_selling_price: 1300000,
      status: 'draft'
    }
  }

  const rpc: Rpc = async (_fn, _args) => {
    void _fn; void _args
    return {
      data: null,
      error: { message: 'duplicate key value violates unique constraint "unique_estimations_project_version"' }
    }
  }

  let thrown = false
  try {
    await createProjectWithEstimationWithRpc(rpc, dto)
  } catch (e) {
    thrown = true
    assert.ok(String(e).includes('duplicate key'))
  }
  assert.ok(thrown)
}
