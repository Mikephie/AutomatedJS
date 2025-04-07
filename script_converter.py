#!/usr/bin/env python3
import os
import re
import sys
from glob import glob
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("script_converter")

class ScriptConverter:
    def __init__(self):
        self.github_repo = "Mikephie/AutomatedJS"
        
        # Default values when info can't be extracted
        self.defaults = {
            "desc": "模块",
            "category": "🔐APP",
            "author": "🅜ⓘ🅚ⓔ🅟ⓗ🅘ⓔ",
        }
        
        # Statistics
        self.stats = {
            "success": 0,
            "failed": 0,
            "skipped": 0
        }
    
    def log(self, message, level="INFO"):
        """Unified logging function"""
        if level == "INFO":
            logger.info(message)
        elif level == "ERROR":
            logger.error(message)
        elif level == "WARN":
            logger.warning(message)
        else:
            logger.debug(message)
    
    def extract_script_content(self, content):
        """Extract content from comment block"""
        comment_match = re.search(r"/\*([\s\S]*?)\*/", content)
        if comment_match:
            return comment_match.group(1).strip()
        return content
    
    def extract_all_info(self, file_path):
        """Extract all needed info from script file"""
        try:
            # First try UTF-8 encoding
            try:
                with open(file_path, "r", encoding="utf-8") as file:
                    content = file.read()
            except UnicodeDecodeError:
                # Fall back to another encoding if UTF-8 fails
                with open(file_path, "r", encoding="latin-1") as file:
                    content = file.read()
            
            # Process comment block
            content = self.extract_script_content(content)
            
            # Get basic file info
            filename = os.path.basename(file_path)
            scriptname = os.path.splitext(filename)[0]
            
            # Parse full script structure
            script_info = self.parse_script(content, scriptname)
            
            return script_info
        except Exception as e:
            self.log(f"Error processing {file_path}: {str(e)}", "ERROR")
            return None
    
    def parse_script(self, content, scriptname):
        """Parse complete script structure, preserving comments and format"""
        # Initialize result
        result = {
            "metadata": self.extract_metadata(content, scriptname),
            "rules": [],
            "rewrites": [],
            "scripts": [],
            "hostname": "",
            "filename": scriptname,
            "raw_content": content
        }
        
        # Extract sections
        self.extract_sections(content, result)
        
        # Extract hostname
        result["hostname"] = self.extract_hostname(content)
        
        return result
    
    def extract_sections(self, content, result):
        """Extract all sections including comments"""
        # Try to extract Loon format sections
        loon_sections = {
            "Rule": re.search(r"\[Rule\]([\s\S]*?)(?=\[|$)", content, re.IGNORECASE),
            "Rewrite": re.search(r"\[Rewrite\]([\s\S]*?)(?=\[|$)", content, re.IGNORECASE),
            "Script": re.search(r"\[Script\]([\s\S]*?)(?=\[|$)", content, re.IGNORECASE)
        }
        
        # Try to extract QX format sections
        qx_sections = {
            "filter_local": re.search(r"\[filter_local\]([\s\S]*?)(?=\[|$)", content, re.IGNORECASE),
            "rewrite_local": re.search(r"\[rewrite_local\]([\s\S]*?)(?=\[|$)", content, re.IGNORECASE)
        }
        
        # Process Loon format
        if loon_sections["Rule"] and loon_sections["Rule"].group(1):
            self.parse_section_with_comments(loon_sections["Rule"].group(1), result["rules"])
        
        if loon_sections["Rewrite"] and loon_sections["Rewrite"].group(1):
            self.parse_section_with_comments(loon_sections["Rewrite"].group(1), result["rewrites"])
        
        if loon_sections["Script"] and loon_sections["Script"].group(1):
            self.parse_section_with_comments(loon_sections["Script"].group(1), result["scripts"])
        
        # If no Loon format found, try QX format
        if not result["rules"] and qx_sections["filter_local"] and qx_sections["filter_local"].group(1):
            self.parse_qx_filter(qx_sections["filter_local"].group(1), result)
        
        if not (result["rewrites"] or result["scripts"]) and qx_sections["rewrite_local"] and qx_sections["rewrite_local"].group(1):
            self.parse_qx_rewrite(qx_sections["rewrite_local"].group(1), result)
    
    def parse_section_with_comments(self, section_content, target_array):
        """Parse section content, preserving comments"""
        lines = section_content.split("\n")
        current_comment = ""
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            if line.startswith("#"):
                # Collect comment
                current_comment = line
            else:
                # Process content line
                target_array.append({
                    "content": line,
                    "comment": current_comment
                })
                # Reset comment
                current_comment = ""
    
    def parse_qx_filter(self, filter_content, result):
        """Parse QX filter rules, convert to Loon format"""
        self.parse_section_with_comments(filter_content, result["rules"])
        
        # Convert QX rules to Loon format
        for i, rule in enumerate(result["rules"]):
            content = rule["content"]
            
            # Convert format
            if content.startswith("host,"):
                parts = content.split(",")
                if len(parts) >= 3:
                    result["rules"][i]["content"] = f"DOMAIN,{parts[1]},{parts[2]}"
            elif content.startswith("url-regex,"):
                parts = content.split(",")
                if len(parts) >= 3:
                    result["rules"][i]["content"] = f"URL-REGEX,{parts[1]},{parts[2]}"
    
    def parse_qx_rewrite(self, rewrite_content, result):
        """Parse QX rewrite rules, split between Loon Rewrite and Script sections"""
        lines = rewrite_content.split("\n")
        current_comment = ""
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            if line.startswith("#"):
                # Collect comment
                current_comment = line
            elif " url " in line:
                parts = line.split(" url ")
                pattern = parts[0].strip()
                action = parts[1].strip()
                
                if action.startswith("reject"):
                    # reject rules go to Rewrite
                    result["rewrites"].append({
                        "content": f"{pattern} - {action}",
                        "comment": current_comment
                    })
                elif action.startswith("script-"):
                    # script rules go to Script
                    script_parts = action.split(" ")
                    if len(script_parts) >= 2:
                        script_type = script_parts[0]
                        script_path = script_parts[1]
                        
                        # Determine type
                        http_type = "http-response" if "response" in script_type else "http-request"
                        requires_body = "true" if "body" in script_type else "false"
                        
                        # Extract script name for tag
                        tag = result["metadata"]["name"]
                        if script_path and "/" in script_path:
                            script_name = script_path.split("/")[-1].split(".")[0]
                            if script_name:
                                tag = script_name
                        
                        result["scripts"].append({
                            "content": f"{http_type} {pattern} script-path={script_path}, requires-body={requires_body}, timeout=60, tag={tag}",
                            "comment": current_comment
                        })
                
                # Reset comment
                current_comment = ""
    
    def extract_metadata(self, content, scriptname):
        """Extract script metadata (name, desc, category, author, icon)"""
        metadata = {
            "name": scriptname,  # Default to script filename
            "desc": self.defaults["desc"],
            "category": self.defaults["category"],
            "author": self.defaults["author"],
            "icon": f"https://raw.githubusercontent.com/Mikephie/icons/main/icon/{scriptname.lower()}.png"
        }
        
        # Extract metadata from comments
        patterns = {
            "name": r"#!name\s*=\s*(.*?)[\n\r]",
            "desc": r"#!desc\s*=\s*(.*?)[\n\r]",
            "category": r"#!category\s*=\s*(.*?)[\n\r]",
            "author": r"#!author\s*=\s*(.*?)[\n\r]",
            "icon": r"#!icon\s*=\s*(.*?)[\n\r]"
        }
        
        for key, pattern in patterns.items():
            match = re.search(pattern, content, re.IGNORECASE)
            if match:
                metadata[key] = match.group(1).strip()
        
        # Try to guess name from content
        if metadata["name"] == scriptname:
            name_match = re.search(r"📜\s*(.*?)[\n\r]", content)
            if name_match:
                metadata["name"] = name_match.group(1).strip()
            else:
                # Try to guess from content
                for name_pattern in [r"彩云天气|caiyun|AXS Payment|([^\n]+脚本)"]:
                    title_match = re.search(name_pattern, content, re.IGNORECASE)
                    if title_match:
                        metadata["name"] = title_match.group(0).strip()
                        break
        
        return metadata
    
    def extract_hostname(self, content):
        """Extract MITM hostname"""
        # Extract from [MITM] or [mitm] section
        mitm_match = re.search(r"\[(MITM|mitm)\]([\s\S]*?)(?=\[|$)", content)
        if mitm_match:
            hostname_match = re.search(r"hostname\s*=\s*([^\n\r]+)", mitm_match.group(2))
            if hostname_match:
                return hostname_match.group(1).strip()
        
        # Extract from whole content
        hostname_match = re.search(r"hostname\s*=\s*([^\n\r]+)", content)
        if hostname_match:
            return hostname_match.group(1).strip()
        
        # Try to extract domain from rules
        domain_match = re.search(r"https?:\/\/([^\/\s]+)", content)
        if domain_match:
            domain = domain_match.group(1).replace("\\", "")
            # If subdomain, convert to wildcard form
            if domain.count(".") > 1:
                parts = domain.split(".")
                return f"*.{parts[-2]}.{parts[-1]}"
            return domain
        
        return "example.com"
    
    def create_loon_config(self, info):
        """Create Loon configuration"""
        metadata = info["metadata"]
        
        # Basic config info
        config = f"""#!name = {metadata["name"]}
#!desc = {metadata["desc"]}
#!category = {metadata["category"]}
#!author = {metadata["author"]}
#!icon = {metadata["icon"]}"""
        
        # Add Rule section
        if info["rules"]:
            config += "\n\n[Rule]"
            last_comment = ""
            
            for rule in info["rules"]:
                # Add comment (if there's a new one)
                if rule["comment"] and rule["comment"] != last_comment:
                    config += f"\n{rule['comment']}"
                    last_comment = rule["comment"]
                
                config += f"\n{rule['content']}"
        
        # Add Rewrite section
        if info["rewrites"]:
            config += "\n\n[Rewrite]"
            last_comment = ""
            
            for rewrite in info["rewrites"]:
                # Add comment (if there's a new one)
                if rewrite["comment"] and rewrite["comment"] != last_comment:
                    config += f"\n{rewrite['comment']}"
                    last_comment = rewrite["comment"]
                
                config += f"\n{rewrite['content']}"
        
        # Add Script section
        if info["scripts"]:
            config += "\n\n[Script]"
            last_comment = ""
            
            for script in info["scripts"]:
                # Add comment (if there's a new one)
                if script["comment"] and script["comment"] != last_comment:
                    config += f"\n{script['comment']}"
                    last_comment = script["comment"]
                
                config += f"\n{script['content']}"
        
        # Add MITM section
        if info["hostname"]:
            config += f"\n\n[MITM]\nhostname = {info['hostname']}"
        
        return config
    
    def create_surge_config(self, info):
        """Create Surge configuration"""
        metadata = info["metadata"]
        
        # Basic config info
        config = f"""#!name = {metadata["name"]}
#!desc = {metadata["desc"]}
#!category = {metadata["category"]}
#!author = {metadata["author"]}"""
        
        # Add Rule section
        if info["rules"]:
            config += "\n\n[Rule]"
            last_comment = ""
            
            for rule in info["rules"]:
                # Add comment
                if rule["comment"] and rule["comment"] != last_comment:
                    config += f"\n{rule['comment']}"
                    last_comment = rule["comment"]
                
                config += f"\n{rule['content']}"
        
        # Add Map Local section (for reject rules)
        reject_rules = [r for r in info["rewrites"] if " - reject" in r["content"]]
        if reject_rules:
            config += "\n\n[Map Local]"
            last_comment = ""
            
            for rule in reject_rules:
                # Add comment
                if rule["comment"] and rule["comment"] != last_comment:
                    config += f"\n{rule['comment']}"
                    last_comment = rule["comment"]
                
                # Extract pattern and reject type
                parts = rule["content"].split(" - ")
                pattern = parts[0]
                reject_type = parts[1] if len(parts) > 1 else "reject"
                
                # Set Map Local parameters
                data_type = "text"
                data = "{}"
                
                if "img" in reject_type:
                    data_type = "img"
                elif "array" in reject_type:
                    data = "[]"
                
                config += f"\n{pattern} data-type={data_type} data=\"{data}\" status-code=200"
        
        # Add Script section
        if info["scripts"]:
            config += "\n\n[Script]"
            last_comment = ""
            rule_counter = 0
            
            for script in info["scripts"]:
                # Add comment
                if script["comment"] and script["comment"] != last_comment:
                    config += f"\n{script['comment']}"
                    last_comment = script["comment"]
                
                # Parse Loon script rule
                loon_script = script["content"]
                match = re.search(r"(http-(?:response|request))\s+([^\s]+)\s+script-path=([^,]+)", loon_script)
                
                if match:
                    http_type = match.group(1).replace("http-", "")
                    pattern = match.group(2)
                    script_path = match.group(3)
                    
                    # Determine if body is required
                    requires_body = "true" if "requires-body=true" in loon_script else "false"
                    
                    # Generate Surge rule name
                    rule_name = info["metadata"]["name"] if rule_counter == 0 else f"{info['metadata']['name']}_{rule_counter+1}"
                    
                    config += f"\n{rule_name} = type=http-{http_type}, pattern={pattern}, script-path={script_path}, requires-body={requires_body}, max-size=-1, timeout=60"
                    
                    rule_counter += 1
        
        # Add MITM section
        if info["hostname"]:
            config += f"\n\n[MITM]\nhostname = %APPEND% {info['hostname']}"
        
        return config
    
    def process_file(self, file_path):
        """Process a single file"""
        try:
            # Extract filename
            filename = os.path.basename(file_path)
            scriptname = os.path.splitext(filename)[0]
            
            self.log(f"Processing: {filename}")
            
            # Extract info
            info = self.extract_all_info(file_path)
            if not info:
                self.log(f"Could not extract info from {filename}, skipping", "WARN")
                self.stats["skipped"] += 1
                return False
            
            # Create output directories if they don't exist
            os.makedirs("Loon", exist_ok=True)
            os.makedirs("Surge", exist_ok=True)
            
            # Create configs
            loon_config = self.create_loon_config(info)
            surge_config = self.create_surge_config(info)
            
            # Save files
            loon_path = f"Loon/{scriptname}.plugin"
            surge_path = f"Surge/{scriptname}.sgmodule"
            
            with open(loon_path, "w", encoding="utf-8") as file:
                file.write(loon_config)
            
            with open(surge_path, "w", encoding="utf-8") as file:
                file.write(surge_config)
            
            self.log(f"Successfully created: {loon_path} and {surge_path}")
            self.stats["success"] += 1
            return True
            
        except Exception as e:
            self.log(f"Error processing {file_path}: {str(e)}", "ERROR")
            self.stats["failed"] += 1
            return False
    
    def process_directory(self, directory, specific_file=None):
        """Process JavaScript files in the directory"""
        self.log(f"Starting to process directory: {directory}")
        
        # Ensure directory exists
        if not os.path.isdir(directory):
            self.log(f"Directory does not exist: {directory}", "ERROR")
            return
        
        if specific_file:
            # Process specific file
            specific_path = os.path.join(directory, specific_file)
            if os.path.isfile(specific_path) and specific_path.endswith(".js"):
                self.process_file(specific_path)
            else:
                self.log(f"Specified file doesn't exist or isn't a JS file: {specific_path}", "ERROR")
        else:
            # Process all files
            js_files = glob(os.path.join(directory, "*.js"))
            if not js_files:
                self.log(f"No JS files found in directory: {directory}", "WARN")
                return
            
            for file_path in js_files:
                self.process_file(file_path)
        
        # Output statistics
        self.log("\nConversion Statistics:")
        self.log(f"Success: {self.stats['success']}")
        self.log(f"Failed: {self.stats['failed']}")
        self.log(f"Skipped: {self.stats['skipped']}")

def main():
    """Main function"""
    if len(sys.argv) < 2:
        print("Usage: python script_converter.py <qx_folder> [specific_file]")
        sys.exit(1)
    
    qx_folder = sys.argv[1]
    specific_file = sys.argv[2] if len(sys.argv) > 2 else None
    
    converter = ScriptConverter()
    converter.process_directory(qx_folder, specific_file)

if __name__ == "__main__":
    main()
