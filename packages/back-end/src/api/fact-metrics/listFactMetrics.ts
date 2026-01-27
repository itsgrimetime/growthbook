import { ListFactMetricsResponse } from "shared/types/openapi";
import { listFactMetricsValidator } from "shared/validators";
import {
  buildPaginationFields,
  createApiRequestHandler,
  getPaginationOptions,
} from "back-end/src/util/handler";

export const listFactMetrics = createApiRequestHandler(
  listFactMetricsValidator,
)(async (req): Promise<ListFactMetricsResponse> => {
  // Build MongoDB filter for better performance
  const filter: Record<string, unknown> = {};

  if (req.query.datasourceId) {
    filter.datasource = req.query.datasourceId;
  }
  if (req.query.factTableId) {
    filter["numerator.factTableId"] = req.query.factTableId;
  }
  if (req.query.projectId) {
    // Match if: projects array contains the projectId OR projects is empty/missing
    // (empty projects means the metric is available to all projects)
    filter.$or = [
      { projects: req.query.projectId },
      { projects: { $size: 0 } },
      { projects: { $exists: false } },
    ];
  }

  const { limit, offset } = getPaginationOptions(req.query);

  // Use database-level pagination for better performance
  const { items, total } = await req.context.models.factMetrics.getAllPaginated(
    filter,
    {
      sort: { id: 1 },
      limit,
      skip: offset,
    },
  );

  return {
    factMetrics: items.map((factMetric) =>
      req.context.models.factMetrics.toApiInterface(factMetric),
    ),
    ...buildPaginationFields({ items, total, limit, offset }),
  };
});
