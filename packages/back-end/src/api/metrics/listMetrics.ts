import { ListMetricsResponse } from "shared/types/openapi";
import { listMetricsValidator } from "shared/validators";
import { getDataSourcesByOrganization } from "back-end/src/models/DataSourceModel";
import { getMetricsPaginated } from "back-end/src/models/MetricModel";
import { toMetricApiInterface } from "back-end/src/services/experiments";
import {
  buildPaginationFields,
  createApiRequestHandler,
  getPaginationOptions,
} from "back-end/src/util/handler";

export const listMetrics = createApiRequestHandler(listMetricsValidator)(async (
  req,
): Promise<ListMetricsResponse> => {
  // Build MongoDB filter for better performance
  const filter: Record<string, unknown> = {};

  if (req.query.datasourceId) {
    filter.datasource = req.query.datasourceId;
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

  // Fetch datasources and paginated metrics in parallel
  const [datasources, { items, total }] = await Promise.all([
    getDataSourcesByOrganization(req.context),
    getMetricsPaginated(req.context, { filter, limit, skip: offset }),
  ]);

  return {
    metrics: items.map((metric) =>
      toMetricApiInterface(
        req.organization,
        metric,
        datasources.find((ds) => ds.id === metric.datasource) || null,
      ),
    ),
    ...buildPaginationFields({ items, total, limit, offset }),
  };
});
