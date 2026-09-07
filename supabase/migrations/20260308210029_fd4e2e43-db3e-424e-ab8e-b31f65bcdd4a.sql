
CREATE OR REPLACE FUNCTION public.get_admin_chart_data()
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result json;
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT json_build_object(
    'responses_over_time', (
      SELECT json_agg(row_to_json(t)) FROM (
        SELECT date_trunc('day', created_at)::date AS day, count(*) AS count
        FROM voice_responses
        GROUP BY 1
        ORDER BY 1
      ) t
    ),
    'status_distribution', (
      SELECT json_agg(row_to_json(t)) FROM (
        SELECT status::text, count(*) AS count
        FROM voice_responses
        GROUP BY status
      ) t
    ),
    'top_contributors', (
      SELECT json_agg(row_to_json(t)) FROM (
        SELECT p.first_name || ' ' || LEFT(p.last_name, 1) || '.' AS name, count(*) AS count
        FROM voice_responses vr
        JOIN profiles p ON p.id = vr.user_id
        GROUP BY p.first_name, p.last_name
        ORDER BY count DESC
        LIMIT 10
      ) t
    ),
    'category_breakdown', (
      SELECT json_agg(row_to_json(t)) FROM (
        SELECT c.name AS category, count(*) AS count
        FROM voice_responses vr
        JOIN questions q ON q.id = vr.question_id
        JOIN categories c ON c.id = q.category_id
        GROUP BY c.name
        ORDER BY count DESC
      ) t
    ),
    'duration_distribution', (
      SELECT json_agg(row_to_json(t)) FROM (
        SELECT bucket, sum(cnt)::bigint AS count FROM (
          SELECT 
            CASE 
              WHEN duration_seconds IS NULL OR duration_seconds <= 30 THEN '0-30s'
              WHEN duration_seconds <= 60 THEN '30-60s'
              WHEN duration_seconds <= 120 THEN '1-2m'
              WHEN duration_seconds <= 300 THEN '2-5m'
              ELSE '5m+'
            END AS bucket,
            count(*) AS cnt
          FROM voice_responses
          GROUP BY 1
        ) sub
        GROUP BY bucket
        ORDER BY 
          CASE bucket
            WHEN '0-30s' THEN 1
            WHEN '30-60s' THEN 2
            WHEN '1-2m' THEN 3
            WHEN '2-5m' THEN 4
            WHEN '5m+' THEN 5
          END
      ) t
    ),
    'daily_activity_30d', (
      SELECT json_agg(row_to_json(t)) FROM (
        SELECT date_trunc('day', created_at)::date AS day, count(*) AS count
        FROM voice_responses
        WHERE created_at >= now() - interval '30 days'
        GROUP BY 1
        ORDER BY 1
      ) t
    )
  ) INTO result;

  RETURN result;
END;
$function$;
