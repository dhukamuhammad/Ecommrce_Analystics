-- ============================================================
-- Migration: Sales/Return/Cancel ke liye order_type column add karna
-- sales_orders table mein
-- ============================================================

-- Column add karo (agar pehle se exist nahi karta)
ALTER TABLE sales_orders 
ADD COLUMN IF NOT EXISTS order_type VARCHAR(20) DEFAULT 'Sales';

-- Existing rows update karo:
-- Invoice amount negative hai toh Return
-- 0 hai toh Cancel
-- Positive hai toh Sales
UPDATE sales_orders 
SET order_type = CASE
    WHEN invoice_amount < 0 THEN 'Return'
    WHEN invoice_amount = 0 THEN 'Cancel'
    ELSE 'Sales'
END
WHERE order_type IS NULL OR order_type = 'Sales';

-- Index add karo performance ke liye
ALTER TABLE sales_orders 
ADD INDEX IF NOT EXISTS idx_order_type (order_type);

SELECT 'Migration complete! order_type column added to sales_orders.' AS result;

-- Result verify karo
SELECT order_type, COUNT(*) as count, SUM(invoice_amount) as total_amount
FROM sales_orders
GROUP BY order_type;
