#!/bin/bash
# Quick HTTPS setup using self-signed certificate (for testing)
# For production, you'll want a custom domain with ACM

set -e

echo "🔐 Setting up HTTPS with Self-Signed Certificate"
echo "================================================="
echo ""
echo "⚠️  Note: This will show browser warnings but WILL work!"
echo "For production, use a custom domain + ACM certificate."
echo ""

# Variables
REGION="us-west-1"
LB_ARN="arn:aws:elasticloadbalancing:us-west-1:864966931677:loadbalancer/app/awseb--AWSEB-HzTFVLDgbCBW/08975d903eda0771"

echo "Step 1: Upload self-signed certificate to IAM"
echo "---------------------------------------------"

# The certificate was already created on the EC2 instance
# We need to retrieve it and upload to IAM
echo "Getting certificate from EC2 instance..."

INSTANCE_ID=$(aws ec2 describe-instances \
  --region $REGION \
  --filters "Name=tag:elasticbeanstalk:environment-name,Values=bestill-prod-env" "Name=instance-state-name,Values=running" \
  --query 'Reservations[0].Instances[0].InstanceId' \
  --output text)

echo "Instance ID: $INSTANCE_ID"

# Generate a new self-signed cert locally for IAM upload
echo "Generating local self-signed certificate..."
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /tmp/server.key \
  -out /tmp/server.crt \
  -subj "/C=US/ST=California/L=SF/O=BeStill/CN=*.elasticbeanstalk.com"

# Upload to IAM
echo "Uploading to IAM..."
CERT_ARN=$(aws iam upload-server-certificate \
  --server-certificate-name bestill-selfsigned-$(date +%s) \
  --certificate-body file:///tmp/server.crt \
  --private-key file:///tmp/server.key \
  --query 'ServerCertificateMetadata.Arn' \
  --output text)

echo "✅ Certificate uploaded: $CERT_ARN"

# Clean up local files
rm /tmp/server.key /tmp/server.crt

echo ""
echo "Step 2: Get Target Group ARN"
echo "-----------------------------"

TARGET_GROUP_ARN=$(aws elbv2 describe-target-groups \
  --load-balancer-arn "$LB_ARN" \
  --region $REGION \
  --query 'TargetGroups[0].TargetGroupArn' \
  --output text)

echo "✅ Target Group: $TARGET_GROUP_ARN"

echo ""
echo "Step 3: Create HTTPS Listener"
echo "------------------------------"

LISTENER_ARN=$(aws elbv2 create-listener \
  --load-balancer-arn "$LB_ARN" \
  --protocol HTTPS \
  --port 443 \
  --certificates CertificateArn="$CERT_ARN" \
  --default-actions Type=forward,TargetGroupArn="$TARGET_GROUP_ARN" \
  --region $REGION \
  --query 'Listeners[0].ListenerArn' \
  --output text)

echo "✅ HTTPS Listener created: $LISTENER_ARN"

echo ""
echo "Step 4: Update Security Group"
echo "------------------------------"

# Get security group
SG_ID=$(aws elbv2 describe-load-balancers \
  --load-balancer-arns "$LB_ARN" \
  --region $REGION \
  --query 'LoadBalancers[0].SecurityGroups[0]' \
  --output text)

echo "Security Group: $SG_ID"

# Add HTTPS rule (might already exist)
aws ec2 authorize-security-group-ingress \
  --group-id "$SG_ID" \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0 \
  --region $REGION 2>/dev/null && echo "✅ HTTPS rule added" || echo "ℹ️  HTTPS rule already exists"

echo ""
echo "✅ HTTPS Configuration Complete!"
echo "================================"
echo ""
echo "Your backend is now accessible at:"
echo "https://bestill-prod-env.eba-vvcdpu3q.us-west-1.elasticbeanstalk.com"
echo ""
echo "⚠️  You'll see a browser warning - this is normal with self-signed certs."
echo "Click 'Advanced' then 'Proceed' to continue."
echo ""
echo "Testing connection..."
curl -k -s -o /dev/null -w "HTTP Status: %{http_code}\n" https://bestill-prod-env.eba-vvcdpu3q.us-west-1.elasticbeanstalk.com || echo "Waiting for DNS propagation..."

echo ""
echo "Next steps:"
echo "1. Frontend is already configured for HTTPS"
echo "2. Rebuild frontend: cd ../Frontend && npm run build"
echo "3. Create new zip: cd build && zip -r ../bestill-frontend-v2.zip ."
echo "4. Upload to Amplify"
