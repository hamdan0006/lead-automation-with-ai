# SSH into EC2 and run these commands to diagnose the issue

# 1. SSH into your EC2 instance
ssh -i your-key.pem ec2-user@YOUR_EC2_IP

# 2. Check if Docker containers are running
docker ps

# 3. Check Docker logs for errors
docker-compose logs --tail=50

# 4. Check if backend crashed
docker-compose logs backend --tail=100

# 5. Check system resources (memory/CPU)
free -h
top

# 6. Check if port 5000 is listening
netstat -tulpn | grep 5000

# 7. Restart everything if needed
cd ~/LeadGenAutomation
docker-compose down
docker-compose up -d

# 8. Check container status after restart
docker ps
docker-compose logs backend --tail=50
